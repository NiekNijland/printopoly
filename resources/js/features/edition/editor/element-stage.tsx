import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent,
    type PointerEvent,
    type ReactNode,
} from 'react';

import { Button } from '@/components/ui/button';
import { FitIcon, HandIcon, MinusIcon, PlusIcon } from '@/components/ui/icons';
import { useTranslation } from '@/hooks/use-translation';
import type { Direction } from '@/lib/render/photos-transform';
import { mm } from '@/lib/render/units';

const PX_PER_MM = 96 / 25.4;
const PADDING_PX = 64;
/** A small element is not blown up further than this, so a banknote does not become a poster. */
const MAX_SCALE = 2.4;

export interface StageGestures {
    /** Accessible name, such as "Foto, pijltjes verschuiven, plus en min zoomen". */
    label: string;
    /** Text for the live region after a change ("Zoom 140%"). */
    announcement: string;
    onPan: (dxMm: number, dyMm: number) => void;
    onNudge: (direction: Direction) => void;
    /** Pinch: the factor by which the zoom changes. */
    onZoomFactor: (factor: number) => void;
    /** Plus and minus keys: +1 or -1 step. */
    onZoomStep: (direction: 1 | -1) => void;
    /** The hint on the photo, "Sleep om te verschuiven, knijp om te zoomen" (ronde 3, UX 1). */
    hint?: string;
}

/** Remembered in this browser once the photo was dragged: the hint has done its work. */
const HINT_SEEN_KEY = 'printopoly.photo-drag-hint';

function hintSeen(): boolean {
    try {
        return window.localStorage.getItem(HINT_SEEN_KEY) === '1';
    } catch {
        return false;
    }
}

function rememberHint(): void {
    try {
        window.localStorage.setItem(HINT_SEEN_KEY, '1');
    } catch {
        // Private mode or storage blocked: the hint shows again next time, which is fine.
    }
}

interface ElementStageProps {
    widthMm: number;
    heightMm: number;
    bleedMm?: number;
    gestures?: StageGestures;
    /** Drawn over the element in mm from the trim corner, e.g. the handles of free layers. */
    overlay?: (info: { pxPerMm: number }) => ReactNode;
    /**
     * Drawn behind the element, centred on it at the same scale, e.g. the rest of the board around a space. It is not
     * inside the zoomed layer: it applies `view` (zoom and shift from the centre of the stage, in px) itself.
     */
    backdrop?: (info: { pxPerMm: number; view: StageView }) => ReactNode;
    /** The view can be zoomed and moved (Niek, 24 nov): wheel or pinch, dragging next to the element, and buttons. */
    zoomable?: boolean;
    /** The view goes back to fit when this changes, e.g. another element on the stage. */
    viewKey?: string;
    /** Share of the stage the element may fill; less leaves room to see the backdrop around it. */
    fill?: number;
    children: ReactNode;
}

const KEY_DIRECTION: Record<string, Direction> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
};

/**
 * Shows an element large in the middle of the workspace (B93). The content is drawn at true
 * size in mm and scaled to fit. With gestures on, the frame is one focus element: drag or
 * pinch on it, or use arrows (0.5 mm) and plus and minus, and a live region says what changed.
 */
export function ElementStage({
    widthMm,
    heightMm,
    bleedMm = 0,
    gestures,
    overlay,
    backdrop,
    fill = 1,
    zoomable = false,
    viewKey,
    children,
}: ElementStageProps) {
    const t = useTranslation();
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    const [box, setBox] = useState({ w: 0, h: 0 });
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinch = useRef<number | null>(null);
    // The hand on the photo stays until the photo is first moved or zoomed in this browser.
    const [seen, setSeen] = useState(hintSeen);
    const used = (): void => {
        if (!seen) {
            setSeen(true);
            rememberHint();
        }
    };

    const view = useStageView(host, zoomable, viewKey);

    useEffect(() => {
        if (host === null || typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (rect !== undefined) {
                setBox({ w: rect.width, h: rect.height });
            }
        });
        observer.observe(host);

        return () => observer.disconnect();
    }, [host]);

    const widthPx = widthMm * PX_PER_MM;
    const heightPx = heightMm * PX_PER_MM;
    const scale =
        box.w > 0 && box.h > 0
            ? Math.max(
                  0.05,
                  Math.min(
                      MAX_SCALE,
                      ((box.w - PADDING_PX) * fill) / widthPx,
                      ((box.h - PADDING_PX) * fill) / heightPx,
                  ),
              )
            : 1;

    const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
        if (gestures === undefined) {
            return;
        }
        event.currentTarget.setPointerCapture?.(event.pointerId);
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        pinch.current = null;
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
        const previous = pointers.current.get(event.pointerId);
        if (gestures === undefined || previous === undefined) {
            return;
        }
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            if (a === undefined || b === undefined) {
                return;
            }
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinch.current !== null && pinch.current > 0) {
                gestures.onZoomFactor(distance / pinch.current);
                used();
            }
            pinch.current = distance;

            return;
        }
        const k = PX_PER_MM * scale * view.zoom;
        gestures.onPan(
            (event.clientX - previous.x) / k,
            (event.clientY - previous.y) / k,
        );
        used();
    };

    // A pinch on a trackpad arrives as a wheel with Ctrl; the page itself never zooms on the photo.
    const onWheel = (event: WheelEvent): void => {
        if (gestures === undefined || !event.ctrlKey) {
            return;
        }
        event.preventDefault();
        gestures.onZoomFactor(Math.exp(-event.deltaY / 200));
        used();
    };
    const latestWheel = useRef(onWheel);
    useEffect(() => {
        latestWheel.current = onWheel;
    });
    const [frame, setFrame] = useState<HTMLDivElement | null>(null);
    useEffect(() => {
        if (frame === null) {
            return;
        }
        const listener = (event: WheelEvent): void =>
            latestWheel.current(event);
        frame.addEventListener('wheel', listener, { passive: false });

        return () => frame.removeEventListener('wheel', listener);
    }, [frame]);

    const onPointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
        pointers.current.delete(event.pointerId);
        pinch.current = null;
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (gestures === undefined) {
            return;
        }
        const direction = KEY_DIRECTION[event.key];
        if (direction !== undefined) {
            event.preventDefault();
            gestures.onNudge(direction);
        } else if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            gestures.onZoomStep(1);
        } else if (event.key === '-' || event.key === '_') {
            event.preventDefault();
            gestures.onZoomStep(-1);
        }
    };

    return (
        <div
            ref={setHost}
            className={
                zoomable
                    ? 'relative flex min-h-0 min-w-0 flex-1 touch-none items-center justify-center overflow-hidden'
                    : 'relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden'
            }
            data-testid="element-stage"
            data-keep-colors
            data-zoom={zoomable ? view.zoom : undefined}
            onPointerDown={view.onPointerDown}
            onClickCapture={view.onClickCapture}
        >
            {/* Outside the zoomed layer, so its fade stays at the edges of the stage; it zooms the board itself. */}
            {backdrop !== undefined &&
                box.w > 0 &&
                backdrop({
                    pxPerMm: PX_PER_MM * scale,
                    view: { zoom: view.zoom, x: view.x, y: view.y },
                })}
            <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center *:pointer-events-auto"
                style={
                    zoomable
                        ? {
                              transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                              transformOrigin: 'center',
                          }
                        : undefined
                }
            >
                <div
                    ref={setFrame}
                    data-stage-frame=""
                    role={gestures === undefined ? undefined : 'group'}
                    aria-label={gestures?.label}
                    tabIndex={gestures === undefined ? undefined : 0}
                    data-focus-view={gestures === undefined ? undefined : ''}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerEnd}
                    onPointerCancel={onPointerEnd}
                    onKeyDown={onKeyDown}
                    className={
                        gestures === undefined
                            ? 'relative shrink-0 shadow-paper'
                            : 'relative shrink-0 cursor-grab touch-none shadow-paper active:cursor-grabbing'
                    }
                    style={{
                        width: widthPx * scale,
                        height: heightPx * scale,
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            width: mm(widthMm + 2 * bleedMm),
                            height: mm(heightMm + 2 * bleedMm),
                            transform: `translate(${-bleedMm * PX_PER_MM * scale}px, ${-bleedMm * PX_PER_MM * scale}px) scale(${scale})`,
                            transformOrigin: '0 0',
                        }}
                    >
                        {children}
                        {overlay !== undefined && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: mm(bleedMm),
                                    top: mm(bleedMm),
                                    width: mm(widthMm),
                                    height: mm(heightMm),
                                }}
                            >
                                {overlay({
                                    pxPerMm: PX_PER_MM * scale * view.zoom,
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {zoomable && (
                <div
                    className="absolute right-3 bottom-3 z-20 flex items-center gap-0.5 rounded-full border-2 border-ink bg-paper p-0.5 shadow-[2px_2px_0_var(--color-ink)]"
                    data-stage-zoom=""
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full"
                        aria-label={t('editor.view_zoom_out')}
                        disabled={view.zoom <= MIN_ZOOM}
                        onClick={() => view.step(-1)}
                    >
                        <MinusIcon size={18} />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-10 min-w-16 rounded-full px-2 text-sm tabular-nums min-[400px]:px-2"
                        aria-label={t('editor.view_fit')}
                        title={t('editor.view_fit')}
                        onClick={view.reset}
                    >
                        {view.zoom === 1 ? (
                            <FitIcon size={18} />
                        ) : (
                            `${Math.round(view.zoom * 100)}%`
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full"
                        aria-label={t('editor.view_zoom_in')}
                        disabled={view.zoom >= MAX_ZOOM}
                        onClick={() => view.step(1)}
                    >
                        <PlusIcon size={18} />
                    </Button>
                </div>
            )}
            {gestures?.hint !== undefined && !seen && (
                <p
                    aria-hidden="true"
                    data-drag-hint=""
                    className="pointer-events-none absolute bottom-1 left-1/2 m-0 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1.5 truncate rounded-full border-2 border-ink bg-paper px-3 py-0.5 text-xs font-semibold whitespace-nowrap shadow-[2px_2px_0_var(--color-ink)]"
                >
                    <HandIcon size={18} className="shrink-0" />
                    <span className="truncate">{gestures.hint}</span>
                </p>
            )}
            {gestures !== undefined && (
                <p className="sr-only" role="status" aria-live="polite">
                    {gestures.announcement}
                </p>
            )}
        </div>
    );
}

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 5;
const ZOOM_STEP = 1.4;
/** A press that moves less than this is a click, not a drag. */
const DRAG_SLOP_PX = 4;

export interface StageView {
    zoom: number;
    x: number;
    y: number;
}

type View = StageView;

const FIT: View = { zoom: 1, x: 0, y: 0 };

function clampZoom(zoom: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Zooms to `next` around a point given relative to the centre of the stage, so that point stays put. */
function zoomAround(view: View, next: number, cx: number, cy: number): View {
    const zoom = clampZoom(next);
    const k = zoom / view.zoom;

    return { zoom, x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k };
}

/**
 * Zoom and move for the stage. Wheel with Ctrl (a trackpad pinch) zooms around the pointer, a plain wheel moves; a
 * drag moves, and two fingers pinch. A press on the element itself stays with the element (its photo or layers);
 * on the board around it, or on a space of the overview, a press without movement is still a click.
 */
function useStageView(
    host: HTMLDivElement | null,
    enabled: boolean,
    viewKey: string | undefined,
) {
    const [view, setView] = useState<View>(FIT);
    const [shownKey, setShownKey] = useState(viewKey);
    if (shownKey !== viewKey) {
        setShownKey(viewKey);
        setView(FIT);
    }
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const moved = useRef(false);

    const relative = useCallback(
        (clientX: number, clientY: number): { cx: number; cy: number } => {
            const rect = host?.getBoundingClientRect();
            if (rect === undefined) {
                return { cx: 0, cy: 0 };
            }

            return {
                cx: clientX - rect.left - rect.width / 2,
                cy: clientY - rect.top - rect.height / 2,
            };
        },
        [host],
    );

    useEffect(() => {
        if (host === null || !enabled) {
            return;
        }
        const onWheel = (event: WheelEvent): void => {
            const target = event.target as Element | null;
            // The photo on the stage zooms itself with a pinch.
            if (target?.closest('[data-focus-view]') && event.ctrlKey) {
                return;
            }
            event.preventDefault();
            if (event.ctrlKey || event.metaKey) {
                const { cx, cy } = relative(event.clientX, event.clientY);
                setView((now) =>
                    zoomAround(
                        now,
                        now.zoom * Math.exp(-event.deltaY / 200),
                        cx,
                        cy,
                    ),
                );
            } else {
                setView((now) => ({
                    ...now,
                    x: now.x - event.deltaX,
                    y: now.y - event.deltaY,
                }));
            }
        };
        host.addEventListener('wheel', onWheel, { passive: false });

        return () => host.removeEventListener('wheel', onWheel);
    }, [host, enabled, relative]);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
        if (!enabled || event.button !== 0) {
            return;
        }
        if (pointers.current.size === 0) {
            moved.current = false;
        }
        const target = event.target as Element;
        // The element itself (its photo, its layers) keeps its own gestures; the board around it and the spaces of
        // the overview move the view.
        const own =
            target.closest('[data-stage-frame]') !== null &&
            target.closest('[data-surround-key]') === null;
        if (own) {
            return;
        }
        const id = event.pointerId;
        pointers.current.set(id, { x: event.clientX, y: event.clientY });
        let start = { x: event.clientX, y: event.clientY };
        let pinch: number | null = null;

        const onMove = (move: globalThis.PointerEvent): void => {
            const previous = pointers.current.get(move.pointerId);
            if (previous === undefined) {
                return;
            }
            pointers.current.set(move.pointerId, {
                x: move.clientX,
                y: move.clientY,
            });
            if (pointers.current.size >= 2) {
                const [a, b] = [...pointers.current.values()];
                if (a === undefined || b === undefined) {
                    return;
                }
                const distance = Math.hypot(a.x - b.x, a.y - b.y);
                if (pinch !== null && pinch > 0) {
                    const factor = distance / pinch;
                    const { cx, cy } = relative(
                        (a.x + b.x) / 2,
                        (a.y + b.y) / 2,
                    );
                    setView((now) =>
                        zoomAround(now, now.zoom * factor, cx, cy),
                    );
                }
                pinch = distance;
                moved.current = true;

                return;
            }
            if (
                !moved.current &&
                Math.hypot(move.clientX - start.x, move.clientY - start.y) <
                    DRAG_SLOP_PX
            ) {
                return;
            }
            if (!moved.current) {
                moved.current = true;
                start = { x: previous.x, y: previous.y };
            }
            const dx = move.clientX - previous.x;
            const dy = move.clientY - previous.y;
            setView((now) => ({ ...now, x: now.x + dx, y: now.y + dy }));
        };
        const onUp = (up: globalThis.PointerEvent): void => {
            if (up.pointerId !== id) {
                return;
            }
            pointers.current.delete(id);
            pinch = null;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };

    // A drag that ends on a space is no click on it.
    const onClickCapture = (event: MouseEvent<HTMLDivElement>): void => {
        if (moved.current) {
            moved.current = false;
            event.stopPropagation();
            event.preventDefault();
        }
    };

    return {
        ...view,
        onPointerDown,
        onClickCapture,
        step: (direction: 1 | -1) =>
            setView((now) =>
                zoomAround(
                    now,
                    direction > 0 ? now.zoom * ZOOM_STEP : now.zoom / ZOOM_STEP,
                    0,
                    0,
                ),
            ),
        reset: () => setView(FIT),
    };
}
