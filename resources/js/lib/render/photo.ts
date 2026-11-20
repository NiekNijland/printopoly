/**
 * Transform of a photo inside a slot. `x` and `y` shift the photo as a fraction of the slot
 * (0 = centred, 0.5 = half a slot width to the right). `scale` is a zoom on top of
 * "cover" (1 fills the slot, 2 zooms in twice). `rotation` is clockwise in quarter turns.
 */
export interface PhotoTransform {
    x: number;
    y: number;
    scale: number;
    rotation: 0 | 90 | 180 | 270;
    grayscale: boolean;
}

export const DEFAULT_PHOTO_TRANSFORM: PhotoTransform = { x: 0, y: 0, scale: 1, rotation: 0, grayscale: false };

export interface PhotoSource {
    src: string;
    transform?: PhotoTransform;
}

export interface PhotoBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface PhotoLayout {
    /** The image box in mm, relative to the slot. */
    box: PhotoBox;
    /** CSS transform, applied around the centre of the image box. */
    transform: string;
    filter: string | undefined;
}

/** Zooming out below "cover" would show empty slot, so scale never goes under 1. */
export function clampScale(scale: number): number {
    return Number.isFinite(scale) ? Math.max(1, scale) : 1;
}

/**
 * Where the image goes in a slot of the given size. For quarter turns of 90 and 270 degrees
 * the image box has swapped sides, so that after the turn it still covers the whole slot.
 */
export function photoLayout(transform: PhotoTransform, widthMm: number, heightMm: number): PhotoLayout {
    const swapped = transform.rotation === 90 || transform.rotation === 270;
    const width = swapped ? heightMm : widthMm;
    const height = swapped ? widthMm : heightMm;
    const dx = Math.round(transform.x * widthMm * 1000) / 1000;
    const dy = Math.round(transform.y * heightMm * 1000) / 1000;

    return {
        box: { left: (widthMm - width) / 2, top: (heightMm - height) / 2, width, height },
        transform: `translate(${dx}mm, ${dy}mm) scale(${clampScale(transform.scale)}) rotate(${transform.rotation}deg)`,
        filter: transform.grayscale ? 'grayscale(1)' : undefined,
    };
}
