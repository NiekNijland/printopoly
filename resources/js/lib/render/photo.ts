import {
    clampTransform,
    defaultTransform,
    minZoom,
    mmPerPx,
    orientedSize,
} from '@/lib/photos/transform';
import type { PhotoTransform } from '@/lib/photos/types';
import type { Size } from '@/lib/print/types';

/**
 * The transform is the one of `lib/photos` (x and y: centre of the visible area as a
 * fraction of the rotated photo, scale relative to cover, rotation in quarter turns).
 */
export type { PhotoTransform };

/** How a photo sits in its element: in a frame, or over the whole space below the heading (B124). */
export type PhotoStyle = 'framed' | 'full';

export const PHOTO_STYLES: readonly PhotoStyle[] = ['framed', 'full'];

export interface PhotoSource {
    src: string;
    /** `full` fills the element, bleed included; anything else is a framed photo. */
    style?: PhotoStyle;
    /**
     * The whole photo fits in the slot instead of filling it (B168). In print the server already cut the visible
     * part, so without a size or transform the image is drawn whole and centred in the slot.
     */
    fit?: boolean;
    transform?: PhotoTransform;
    /**
     * Pixel size of the photo, after EXIF orientation. Without it the photo is taken to have
     * the aspect ratio of its slot, so panning has no effect.
     */
    width?: number;
    height?: number;
}

export interface PhotoBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface PhotoLayout {
    /** The unrotated image box in mm, relative to the slot. */
    box: PhotoBox;
    /** CSS transform, applied around the centre of the image box. */
    transform: string;
    filter: string | undefined;
    /** `contain` for a print crop of a photo that fits: the image box is the slot and the image keeps its shape. */
    objectFit: 'fill' | 'contain';
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

/**
 * Where the image goes in a slot of the given size: the image is drawn at its true size for
 * this zoom, then turned around its own centre so that the chosen point of the (rotated)
 * photo lies in the middle of the slot.
 */
export function photoLayout(
    photo: PhotoSource,
    widthMm: number,
    heightMm: number,
): PhotoLayout {
    const transform = photo.transform ?? defaultTransform();
    const target: Size = { w: widthMm, h: heightMm };
    const known =
        photo.width !== undefined &&
        photo.height !== undefined &&
        photo.width > 0 &&
        photo.height > 0;

    // A print crop of a photo that fits: its shape is that of the visible part, drawn whole in the middle.
    if (photo.fit === true && !known && photo.transform === undefined) {
        return {
            box: { left: 0, top: 0, width: widthMm, height: heightMm },
            transform: 'rotate(0deg)',
            filter: undefined,
            objectFit: 'contain',
        };
    }

    const source: Size = known
        ? { w: photo.width ?? widthMm, h: photo.height ?? heightMm }
        : { w: widthMm, h: heightMm };
    const fit = transform.fit === true || photo.fit === true;
    const min = minZoom({ fit });
    const scale = Number.isFinite(transform.scale)
        ? Math.max(min, transform.scale)
        : 1;
    // Kept on the photo for this slot: a placement made for another frame (a deed showing the photo of its
    // space, B157) or a start at the top third never shows an edge.
    const t = clampTransform(
        source,
        { ...transform, scale, ...(fit ? { fit: true } : {}) },
        target,
    );
    const k = mmPerPx(source, t, target);
    const rotated = orientedSize(source, t.rotation);
    const centreX = widthMm / 2 - (t.x - 0.5) * rotated.w * k;
    const centreY = heightMm / 2 - (t.y - 0.5) * rotated.h * k;
    const width = source.w * k;
    const height = source.h * k;

    return {
        box: {
            left: round(centreX - width / 2),
            top: round(centreY - height / 2),
            width: round(width),
            height: round(height),
        },
        transform: `rotate(${t.rotation}deg)`,
        filter: t.grayscale ? 'grayscale(1)' : undefined,
        objectFit: 'fill',
    };
}
