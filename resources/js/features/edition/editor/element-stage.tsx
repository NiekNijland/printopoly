import {
    useRef,
    useState,
    type MouseEvent,
    type PointerEvent,
    type ReactNode,
} from 'react';

import { HandIcon } from '@/components/icons';
import { StageFrame } from '@/features/edition/editor/stage-frame';
import {
    FIT,
    ZOOM_STEP,
    createViewMove,
    fitScale,
    isOwnPress,
    zoomAround,
    type View,
} from '@/features/edition/editor/stage-view';
import { StageZoomButtons } from '@/features/edition/editor/stage-zoom-buttons';
import type { StageGestures } from '@/features/edition/editor/use-frame-gestures';
import { useStageBox } from '@/features/edition/editor/use-stage-box';
import {
    useRelative,
    useViewWheel,
} from '@/features/edition/editor/use-view-wheel';

const PX_PER_MM = 96 / 25.4;

/** Remembered in this browser once the photo was dragged: the hint has done its work. */
const HINT_SEEN_KEY = 'printopoly.photo-drag-hint';

const hintSeen = (): boolean => {
    try {
        return window.localStorage.getItem(HINT_SEEN_KEY) === '1';
    } catch {
        return false;
    }
};

const rememberHint = (): void => {
    try {
        window.localStorage.setItem(HINT_SEEN_KEY, '1');
    } catch {
        // Private mode or storage blocked: the hint shows again next time, which is fine.
    }
};

const useHintSeen = () => {
    // The hand on the photo stays until the photo is first moved or zoomed in this browser.
    const [seen, setSeen] = useState(hintSeen);
    const used = (): void => {
        if (!seen) {
            setSeen(true);
            rememberHint();
        }
    };

    return { seen, used };
};

type ElementStageProps = {
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
};

type StageNotesProps = {
    gestures: StageGestures | undefined;
    seen: boolean;
};

const StageNotes = ({ gestures, seen }: StageNotesProps) => (
    <>
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
    </>
);

/**
 * Shows an element large in the middle of the workspace (B93). The content is drawn at true
 * size in mm and scaled to fit. With gestures on, the frame is one focus element: drag or
 * pinch on it, or use arrows (0.5 mm) and plus and minus, and a live region says what changed.
 */
export const ElementStage = ({
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
}: ElementStageProps) => {
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    const box = useStageBox(host);
    const { seen, used } = useHintSeen();
    const view = useStageView(host, zoomable, viewKey);

    const scale = fitScale(box, widthMm, heightMm, fill);
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
                <StageFrame
                    gestures={gestures}
                    used={used}
                    scale={scale}
                    zoom={view.zoom}
                    widthMm={widthMm}
                    heightMm={heightMm}
                    bleedMm={bleedMm}
                    overlay={overlay}
                >
                    {children}
                </StageFrame>
            </div>
            {zoomable && (
                <StageZoomButtons
                    zoom={view.zoom}
                    onStep={view.step}
                    onFit={view.reset}
                />
            )}
            <StageNotes gestures={gestures} seen={seen} />
        </div>
    );
};

export type StageView = View;

/**
 * Zoom and move for the stage. Wheel with Ctrl (a trackpad pinch) zooms around the pointer, a plain wheel moves; a
 * drag moves, and two fingers pinch. A press on the element itself stays with the element (its photo or layers);
 * on the board around it, or on a space of the overview, a press without movement is still a click.
 */
const useStageView = (
    host: HTMLDivElement | null,
    enabled: boolean,
    viewKey: string | undefined,
) => {
    const [view, setView] = useState<View>(FIT);
    const [shownKey, setShownKey] = useState(viewKey);
    if (shownKey !== viewKey) {
        setShownKey(viewKey);
        setView(FIT);
    }
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const moved = useRef(false);

    const relative = useRelative(host);

    useViewWheel(host, enabled, relative, setView);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
        if (!enabled || event.button !== 0) {
            return;
        }
        if (pointers.current.size === 0) {
            moved.current = false;
        }
        if (isOwnPress(event.target)) {
            return;
        }
        const id = event.pointerId;
        pointers.current.set(id, { x: event.clientX, y: event.clientY });
        const onMove = createViewMove({
            pointers: pointers.current,
            moved,
            start: { x: event.clientX, y: event.clientY },
            relative,
            setView,
        });
        const onUp = (up: globalThis.PointerEvent): void => {
            if (up.pointerId !== id) {
                return;
            }
            pointers.current.delete(id);
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
};
