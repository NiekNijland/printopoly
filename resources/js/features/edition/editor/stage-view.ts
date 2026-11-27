import type { Dispatch, SetStateAction } from 'react';

const PX_PER_MM = 96 / 25.4;
const PADDING_PX = 64;
/** A small element is not blown up further than this, so a banknote does not become a poster. */
const MAX_SCALE = 2.4;

export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 1.4;
/** A press that moves less than this is a click, not a drag. */
const DRAG_SLOP_PX = 4;

export type View = {
    zoom: number;
    x: number;
    y: number;
};

export const FIT: View = { zoom: 1, x: 0, y: 0 };

const clampZoom = (zoom: number): number => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
};

/** Zooms to `next` around a point given relative to the centre of the stage, so that point stays put. */
export const zoomAround = (
    view: View,
    next: number,
    cx: number,
    cy: number,
): View => {
    const zoom = clampZoom(next);
    const k = zoom / view.zoom;

    return { zoom, x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k };
};

type Point = { x: number; y: number };

export type ViewDrag = {
    pointers: Map<number, Point>;
    moved: { current: boolean };
    start: Point;
    relative: (clientX: number, clientY: number) => { cx: number; cy: number };
    setView: Dispatch<SetStateAction<View>>;
};

export const createViewMove = ({
    pointers,
    moved,
    start: first,
    relative,
    setView,
}: ViewDrag) => {
    let start = first;
    let pinch: number | null = null;

    return (move: { pointerId: number; clientX: number; clientY: number }) => {
        const previous = pointers.get(move.pointerId);
        if (previous === undefined) {
            return;
        }
        pointers.set(move.pointerId, {
            x: move.clientX,
            y: move.clientY,
        });
        if (pointers.size >= 2) {
            const [a, b] = [...pointers.values()];
            if (a === undefined || b === undefined) {
                return;
            }
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinch !== null && pinch > 0) {
                const factor = distance / pinch;
                const { cx, cy } = relative((a.x + b.x) / 2, (a.y + b.y) / 2);
                setView((now) => zoomAround(now, now.zoom * factor, cx, cy));
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
};

// The element itself (its photo, its layers) keeps its own gestures; the board around it and the spaces of
// the overview move the view.
export const isOwnPress = (target: EventTarget | null): boolean =>
    target instanceof Element &&
    target.closest('[data-stage-frame]') !== null &&
    target.closest('[data-surround-key]') === null;

export const fitScale = (
    box: { w: number; h: number },
    widthMm: number,
    heightMm: number,
    fill: number,
): number => {
    const widthPx = widthMm * PX_PER_MM;
    const heightPx = heightMm * PX_PER_MM;

    return box.w > 0 && box.h > 0
        ? Math.max(
              0.05,
              Math.min(
                  MAX_SCALE,
                  ((box.w - PADDING_PX) * fill) / widthPx,
                  ((box.h - PADDING_PX) * fill) / heightPx,
              ),
          )
        : 1;
};
