import type { Locale, Localized } from '../game/types';
import type { Rect, Size } from '../print/types';
import {
    clampTransform,
    mmPerPx,
    orientedSize,
    visibleRegion,
} from './transform';
import type { PhotoTransform, Rotation } from './types';

const MM_PER_INCH = 25.4;

/** B9, B61: print sources are cut to at most this many dpi, bleed included. */
export const MAX_PRINT_DPI = 300;
/** B94: neutral from here, a warning below. */
export const MIN_SHARP_DPI = 150;

/** The area a photo has to fill: the frame plus the bleed on every side. */
export function placementTarget(frame: Size, bleed: number): Size {
    return { w: frame.w + 2 * bleed, h: frame.h + 2 * bleed };
}

/**
 * Pixels per inch the photo has on the printed target. `source` is the photo in pixels after
 * EXIF orientation; `target` is in mm and includes the bleed.
 */
export function effectiveDpi(
    source: Size,
    t: PhotoTransform,
    target: Size,
): number {
    return MM_PER_INCH / mmPerPx(source, t, target);
}

/**
 * B251: a large print (the board centre, the box lid) is looked at from further away, so it is sharp enough from
 * 100 dpi. A target counts as large when its short side is at least this many mm.
 */
export const LARGE_TARGET_MM = 100;
export const MIN_SHARP_DPI_LARGE = 100;

/** The dpi a photo needs on this target (frame plus bleed, in mm) to count as sharp. */
export function minSharpDpi(target?: Size): number {
    return target !== undefined &&
        Math.min(target.w, target.h) >= LARGE_TARGET_MM
        ? MIN_SHARP_DPI_LARGE
        : MIN_SHARP_DPI;
}

export function isSharpEnough(dpi: number, target?: Size): boolean {
    return Math.round(dpi) >= minSharpDpi(target);
}

/**
 * How a photo prints on one place (B251): the one measure the editor line, the check and the print page share.
 * `dpi` is what the print job gets (before the 300 dpi cap), `printed` is the target in mm, and `needed` is the
 * size in pixels this photo (same shape, same crop) would need to be sharp there.
 */
export interface PhotoQuality {
    dpi: number;
    sharp: boolean;
    printed: Size;
    needed: Size;
}

export function photoQuality(
    source: Size,
    transform: PhotoTransform,
    frame: Size,
    bleed: number,
): PhotoQuality {
    const target = placementTarget(frame, bleed);
    // Measured as it prints: the renderers and the print job keep every photo on its frame (R5-01).
    const dpi = effectiveDpi(
        source,
        clampTransform(source, transform, target),
        target,
    );
    const min = minSharpDpi(target);
    // The long side up to a round number, the short side in the same proportion.
    const long = Math.max(source.w, source.h);
    const grow = roundUp(long * Math.max(1, min / dpi)) / long;

    return {
        dpi,
        sharp: isSharpEnough(dpi, target),
        printed: target,
        needed: {
            w: Math.round(source.w * grow),
            h: Math.round(source.h * grow),
        },
    };
}

/** Up to a round number of pixels, so the advice reads as advice: 587 becomes 600, 2413 becomes 2500. */
function roundUp(px: number): number {
    const step = px < 1000 ? 50 : 100;

    return Math.ceil(px / step) * step;
}

/**
 * The line under a photo in the editor: "Scherp genoeg", or how many pixels this place needs (B251, Kees in round
 * 6: "te klein" alone did not say what to do). Never alarming: a smaller photo still prints, only softer.
 */
export function resolutionLabel(
    quality: Pick<PhotoQuality, 'sharp' | 'needed'>,
    locale: Locale,
): string {
    if (quality.sharp) {
        return locale === 'nl' ? 'Scherp genoeg' : 'Sharp enough';
    }

    const size = `${String(quality.needed.w)} × ${String(quality.needed.h)} px`;

    return locale === 'nl'
        ? `Wat klein voor deze plek: op papier wordt hij zachter. Scherp is hij vanaf ongeveer ${size}.`
        : `A bit small for this place: it will look softer on paper. It is sharp from about ${size}.`;
}

/** The message of the check for a photo that is too small (B251): how big it is and how big it should be. */
export function lowResolutionMessage(
    source: Size,
    quality: Pick<PhotoQuality, 'needed'>,
    image: boolean,
): Localized {
    const has = `${String(source.w)} × ${String(source.h)} px`;
    const needs = `${String(quality.needed.w)} × ${String(quality.needed.h)} px`;

    return image
        ? {
              nl: `Deze afbeelding is ${has} en wordt op papier wat korrelig. Scherp wordt hij vanaf ongeveer ${needs}. Printen kan ook zo.`,
              en: `This image is ${has} and will look a little grainy on paper. It is sharp from about ${needs}. You can print it as it is.`,
          }
        : {
              nl: `Deze foto is ${has} en wordt op papier wat korrelig. Scherp wordt hij vanaf ongeveer ${needs}. Printen kan ook zo.`,
              en: `This photo is ${has} and will look a little grainy on paper. It is sharp from about ${needs}. You can print it as it is.`,
          };
}

/** What the server-side print job does for one placement (B61). See `docs/foto-uitsnede.md`. */
export interface CropSpec {
    /** Whole-pixel rectangle in the original photo (after EXIF orientation, before the quarter turn). */
    rect: Rect;
    /** Quarter turn clockwise, applied after the crop. */
    rotation: Rotation;
    grayscale: boolean;
    /** Size of the finished image in pixels; its aspect ratio is that of the target. */
    output: Size;
    /** Effective dpi of the source on the target, before the 300 dpi cap. */
    sourceDpi: number;
    /** dpi of the finished image: `min(sourceDpi, 300)`. */
    outputDpi: number;
}

/** Maps a rectangle from rotated photo pixels back to original photo pixels. */
function unrotateRect(r: Rect, source: Size, rotation: Rotation): Rect {
    const map = (u: number, v: number): [number, number] => {
        switch (rotation) {
            case 90:
                return [v, source.h - u];
            case 180:
                return [source.w - u, source.h - v];
            case 270:
                return [source.w - v, u];
            default:
                return [u, v];
        }
    };
    const [x1, y1] = map(r.x, r.y);
    const [x2, y2] = map(r.x + r.w, r.y + r.h);
    return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x2 - x1),
        h: Math.abs(y2 - y1),
    };
}

export function cropSpec(
    source: Size,
    placed: PhotoTransform,
    target: Size,
): CropSpec {
    // Kept on the photo for this target, as the server does (PhotoCrop::compute).
    const t = clampTransform(source, placed, target);
    const o = orientedSize(source, t.rotation);
    const region = visibleRegion(source, t, target);
    // Pull the rectangle onto the photo (rounding noise only; the transform is clamped).
    const x0 = Math.max(0, region.x);
    const y0 = Math.max(0, region.y);
    const x1 = Math.min(o.w, region.x + region.w);
    const y1 = Math.min(o.h, region.y + region.h);
    const exact = unrotateRect(
        { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
        source,
        t.rotation,
    );

    const left = Math.max(0, Math.floor(exact.x + 1e-6));
    const top = Math.max(0, Math.floor(exact.y + 1e-6));
    const right = Math.min(source.w, Math.ceil(exact.x + exact.w - 1e-6));
    const bottom = Math.min(source.h, Math.ceil(exact.y + exact.h - 1e-6));

    const sourceDpi = effectiveDpi(source, t, target);
    const outputDpi = Math.min(MAX_PRINT_DPI, sourceDpi);
    // A photo that fits (B168) may be smaller than the target: the output is the visible part only, at its own
    // size, and the renderer draws it whole in the middle of the frame.
    const k = MM_PER_INCH / sourceDpi;
    const out =
        t.fit === true
            ? { w: (x1 - x0) * k, h: (y1 - y0) * k }
            : { w: target.w, h: target.h };
    return {
        rect: { x: left, y: top, w: right - left, h: bottom - top },
        rotation: t.rotation,
        grayscale: t.grayscale,
        output: {
            w: Math.max(1, Math.round((out.w / MM_PER_INCH) * outputDpi)),
            h: Math.max(1, Math.round((out.h / MM_PER_INCH) * outputDpi)),
        },
        sourceDpi,
        outputDpi,
    };
}
