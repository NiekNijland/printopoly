import type { Locale, Localized } from '../../types/game';
import type { PhotoTransform } from '../../types/photos';
import type { Size } from '../../types/print';
import { clampTransform, mmPerPx } from './photos-transform';

const MM_PER_INCH = 25.4;

/** B94: neutral from here, a warning below. */
const MIN_SHARP_DPI = 150;

/** The area a photo has to fill: the frame plus the bleed on every side. */
export const placementTarget = (frame: Size, bleed: number): Size => {
    return { w: frame.w + 2 * bleed, h: frame.h + 2 * bleed };
};

/**
 * Pixels per inch the photo has on the printed target. `source` is the photo in pixels after
 * EXIF orientation; `target` is in mm and includes the bleed.
 */
const effectiveDpi = (
    source: Size,
    t: PhotoTransform,
    target: Size,
): number => {
    return MM_PER_INCH / mmPerPx(source, t, target);
};

/**
 * B251: a large print (the board centre, the box lid) is looked at from further away, so it is sharp enough from
 * 100 dpi. A target counts as large when its short side is at least this many mm.
 */
const LARGE_TARGET_MM = 100;
const MIN_SHARP_DPI_LARGE = 100;

/** The dpi a photo needs on this target (frame plus bleed, in mm) to count as sharp. */
const minSharpDpi = (target?: Size): number => {
    return target !== undefined &&
        Math.min(target.w, target.h) >= LARGE_TARGET_MM
        ? MIN_SHARP_DPI_LARGE
        : MIN_SHARP_DPI;
};

const isSharpEnough = (dpi: number, target?: Size): boolean => {
    return Math.round(dpi) >= minSharpDpi(target);
};

/**
 * How a photo prints on one place (B251): the one measure the editor line, the check and the print page share.
 * `dpi` is what the print job gets (before the 300 dpi cap), `printed` is the target in mm, and `needed` is the
 * size in pixels this photo (same shape, same crop) would need to be sharp there.
 */
export type PhotoQuality = {
    dpi: number;
    sharp: boolean;
    printed: Size;
    needed: Size;
};

export const photoQuality = (
    source: Size,
    transform: PhotoTransform,
    frame: Size,
    bleed: number,
): PhotoQuality => {
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
};

/** Up to a round number of pixels, so the advice reads as advice: 587 becomes 600, 2413 becomes 2500. */
const roundUp = (px: number): number => {
    const step = px < 1000 ? 50 : 100;

    return Math.ceil(px / step) * step;
};

/**
 * The line under a photo in the editor: "Scherp genoeg", or how many pixels this place needs (B251, Kees in round
 * 6: "te klein" alone did not say what to do). Never alarming: a smaller photo still prints, only softer.
 */
export const resolutionLabel = (
    quality: Pick<PhotoQuality, 'sharp' | 'needed'>,
    locale: Locale,
): string => {
    if (quality.sharp) {
        return locale === 'nl' ? 'Scherp genoeg' : 'Sharp enough';
    }

    const size = `${String(quality.needed.w)} × ${String(quality.needed.h)} px`;

    return locale === 'nl'
        ? `Wat klein voor deze plek: op papier wordt hij zachter. Scherp is hij vanaf ongeveer ${size}.`
        : `A bit small for this place: it will look softer on paper. It is sharp from about ${size}.`;
};

/** The message of the check for a photo that is too small (B251): how big it is and how big it should be. */
export const lowResolutionMessage = (
    source: Size,
    quality: Pick<PhotoQuality, 'needed'>,
    image: boolean,
): Localized => {
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
};
