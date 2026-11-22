import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
} from 'react';

import { HandIcon } from '@/components/icons';
import type { Direction } from '@/lib/photos/transform';
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
    children,
}: ElementStageProps) {
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
                      (box.w - PADDING_PX) / widthPx,
                      (box.h - PADDING_PX) / heightPx,
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
        const k = PX_PER_MM * scale;
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
            className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden"
            data-testid="element-stage"
            data-keep-colors
        >
            <div
                ref={setFrame}
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
                            {overlay({ pxPerMm: PX_PER_MM * scale })}
                        </div>
                    )}
                </div>
            </div>
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
