import type { Locale, Localized } from '../game/types';
import type { Rect, Size } from '../print/types';
import { mmPerPx, orientedSize, visibleRegion } from './transform';
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

export function isSharpEnough(dpi: number): boolean {
    return Math.round(dpi) >= MIN_SHARP_DPI;
}

/** "Resolutie 284 dpi, scherp genoeg" in the editor, with the warning wording below 150 dpi. */
export function resolutionLabel(dpi: number, locale: Locale): string {
    const n = Math.round(dpi);
    const labels: Record<'ok' | 'low', Localized> = {
        ok: {
            nl: `Resolutie ${n} dpi, scherp genoeg`,
            en: `Resolution ${n} dpi, sharp enough`,
        },
        low: {
            nl: `Resolutie ${n} dpi, te weinig`,
            en: `Resolution ${n} dpi, too low`,
        },
    };
    return labels[isSharpEnough(dpi) ? 'ok' : 'low'][locale];
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
    t: PhotoTransform,
    target: Size,
): CropSpec {
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
    return {
        rect: { x: left, y: top, w: right - left, h: bottom - top },
        rotation: t.rotation,
        grayscale: t.grayscale,
        output: {
            w: Math.max(1, Math.round((target.w / MM_PER_INCH) * outputDpi)),
            h: Math.max(1, Math.round((target.h / MM_PER_INCH) * outputDpi)),
        },
        sourceDpi,
        outputDpi,
    };
}
