import {
    clampTransform,
    defaultTransform,
    mmPerPx,
    orientedSize,
} from '@/lib/render/photos-transform';
import type { PhotoTransform, Rotation } from '@/types/photos';
import type { Rect, Size } from '@/types/print';

export const coverTransform = (
    source: Size,
    target: Size,
    rotation: Rotation = 0,
    grayscale = false,
): PhotoTransform =>
    clampTransform(
        source,
        { ...defaultTransform(), rotation, grayscale },
        target,
    );

export const visibleRegion = (
    source: Size,
    t: PhotoTransform,
    target: Size,
): Rect => {
    const o = orientedSize(source, t.rotation);
    const k = mmPerPx(source, t, target);
    const w = target.w / k;
    const h = target.h / k;

    return { x: t.x * o.w - w / 2, y: t.y * o.h - h / 2, w, h };
};

export const coversTarget = (
    source: Size,
    t: PhotoTransform,
    target: Size,
): boolean => {
    const o = orientedSize(source, t.rotation);
    const r = visibleRegion(source, t, target);
    const tol = 1e-6 * Math.max(o.w, o.h);

    return (
        r.x >= -tol &&
        r.y >= -tol &&
        r.x + r.w <= o.w + tol &&
        r.y + r.h <= o.h + tol
    );
};
