import type { Rect, Size } from '../print/types';
import type { PhotoTransform, Rotation } from './types';

/** Zoom range of the editor: 100 to 300%. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
/** One arrow key press moves the photo this far (B73, B98). */
export const NUDGE_MM = 0.5;
/** One plus or minus key press changes the zoom by this much. */
export const ZOOM_STEP = 0.1;

const EPS = 1e-9;

export type Direction = 'left' | 'right' | 'up' | 'down';

/** Photo size in source pixels, target size in mm. */
export interface Placement {
    source: Size;
    target: Size;
}

export function defaultTransform(): PhotoTransform {
    return { x: 0.5, y: 0.5, scale: 1, rotation: 0, grayscale: false };
}

/** The photo after rotation. */
export function orientedSize(source: Size, rotation: Rotation): Size {
    return rotation === 90 || rotation === 270
        ? { w: source.h, h: source.w }
        : { w: source.w, h: source.h };
}

/** mm per source pixel at which the photo exactly covers the target (zoom 100%). */
export function coverMmPerPx(
    source: Size,
    rotation: Rotation,
    target: Size,
): number {
    const o = orientedSize(source, rotation);
    return Math.max(target.w / o.w, target.h / o.h);
}

/** mm per source pixel at which the whole photo fits inside the target (letterboxed). */
export function containMmPerPx(
    source: Size,
    rotation: Rotation,
    target: Size,
): number {
    const o = orientedSize(source, rotation);
    return Math.min(target.w / o.w, target.h / o.h);
}

/** mm per source pixel for this transform. */
export function mmPerPx(source: Size, t: PhotoTransform, target: Size): number {
    return coverMmPerPx(source, t.rotation, target) * t.scale;
}

/** The part of the rotated photo that shows in the target, in rotated source pixels. */
export function visibleRegion(
    source: Size,
    t: PhotoTransform,
    target: Size,
): Rect {
    const o = orientedSize(source, t.rotation);
    const k = mmPerPx(source, t, target);
    const w = target.w / k;
    const h = target.h / k;
    return { x: t.x * o.w - w / 2, y: t.y * o.h - h / 2, w, h };
}

/** True when the photo reaches every edge of the target. */
export function coversTarget(
    source: Size,
    t: PhotoTransform,
    target: Size,
): boolean {
    const o = orientedSize(source, t.rotation);
    const r = visibleRegion(source, t, target);
    const tol = 1e-6 * Math.max(o.w, o.h);
    return (
        r.x >= -tol &&
        r.y >= -tol &&
        r.x + r.w <= o.w + tol &&
        r.y + r.h <= o.h + tol
    );
}

function clampAxis(center: number, half: number): number {
    if (half >= 0.5 - EPS) return 0.5;
    return Math.min(1 - half, Math.max(half, center));
}

/** Keeps the zoom in range and the pan such that the photo always covers the target. */
export function clampTransform(
    source: Size,
    t: PhotoTransform,
    target: Size,
): PhotoTransform {
    const scale = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Number.isFinite(t.scale) ? t.scale : MIN_ZOOM),
    );
    const o = orientedSize(source, t.rotation);
    const k = coverMmPerPx(source, t.rotation, target) * scale;
    const halfW = target.w / k / 2 / o.w;
    const halfH = target.h / k / 2 / o.h;
    return { ...t, scale, x: clampAxis(t.x, halfW), y: clampAxis(t.y, halfH) };
}

/** Sets the zoom (1 to 3), keeping the centre of the frame fixed. */
export function setZoom(
    source: Size,
    t: PhotoTransform,
    target: Size,
    scale: number,
): PhotoTransform {
    return clampTransform(source, { ...t, scale }, target);
}

/** Plus and minus keys, and pinch steps. */
export function zoomBy(
    source: Size,
    t: PhotoTransform,
    target: Size,
    delta: number,
): PhotoTransform {
    return setZoom(
        source,
        t,
        target,
        Math.round((t.scale + delta) * 1e6) / 1e6,
    );
}

/** Drags the photo by `dxMm`, `dyMm` as the pointer moved: the picture follows the finger. */
export function panBy(
    source: Size,
    t: PhotoTransform,
    target: Size,
    dxMm: number,
    dyMm: number,
): PhotoTransform {
    const o = orientedSize(source, t.rotation);
    const k = mmPerPx(source, t, target);
    return clampTransform(
        source,
        { ...t, x: t.x - dxMm / k / o.w, y: t.y - dyMm / k / o.h },
        target,
    );
}

/** Arrow keys: the photo moves in the direction of the arrow, 0.5 mm per press. */
export function nudge(
    source: Size,
    t: PhotoTransform,
    target: Size,
    direction: Direction,
    stepMm = NUDGE_MM,
): PhotoTransform {
    const dx =
        direction === 'right' ? stepMm : direction === 'left' ? -stepMm : 0;
    const dy = direction === 'down' ? stepMm : direction === 'up' ? -stepMm : 0;
    return panBy(source, t, target, dx, dy);
}

/** Rotates the photo a quarter turn (1 = clockwise, -1 = anticlockwise) and keeps the same spot centred. */
export function rotateQuarter(
    source: Size,
    t: PhotoTransform,
    target: Size,
    turns: 1 | -1,
): PhotoTransform {
    const rotation = ((t.rotation + 90 * turns + 360) % 360) as Rotation;
    const [x, y] = turns === 1 ? [1 - t.y, t.x] : [t.y, 1 - t.x];
    return clampTransform(source, { ...t, rotation, x, y }, target);
}

/** A fresh transform that covers the target, centred, at 100%. */
export function coverTransform(
    source: Size,
    target: Size,
    rotation: Rotation = 0,
    grayscale = false,
): PhotoTransform {
    return clampTransform(
        source,
        { ...defaultTransform(), rotation, grayscale },
        target,
    );
}
