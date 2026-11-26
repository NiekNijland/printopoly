import type { Edition } from '@/lib/render/edition-types';

import type { PhotoTargets } from './print-photo-targets';

/** The server crops at 300 dpi at most (config printopoly.photos.max_dpi): more pixels never reach the paper. */
const PRINT_PX_PER_MM = 300 / 25.4;

/** Room on top of the exact need, for rounding and a little extra zoom. */
const MARGIN = 1.15;

/** A photo on a free layer carries its own size: assume the largest frame there is. */
const LAYER_FRAME_MM = 300;

/** Photos are only made smaller when that saves at least this much: a fifth of the pixels or more. */
const WORTH_IT = 0.9;

/**
 * Per photo, the length in mm of the largest frame it fills times its zoom (bug 11 of test round 4): the print
 * needs at most 300 dpi of that. Counted with the short side of the photo against the long side of the frame, so
 * it is never too small, whatever the crop or the rotation.
 */
export function photoNeeds(
    edition: Edition,
    targets: PhotoTargets,
): Map<string, number> {
    const needs = new Map<string, number>();
    const need = (id: string, mm: number) => {
        needs.set(id, Math.max(needs.get(id) ?? 0, mm));
    };
    const frame = (key: string): number => {
        const sizes = [targets.printer[key], targets.home[key]].flatMap(
            (size) => (size === undefined ? [] : [Math.max(size.w, size.h)]),
        );

        return sizes.length === 0 ? 0 : Math.max(...sizes);
    };

    for (const [key, override] of Object.entries(edition.elements)) {
        if (override.photo !== undefined) {
            need(
                override.photo.photoId,
                frame(`${key}#photo`) * Math.max(1, override.photo.scale),
            );
        }

        if (override.background !== undefined) {
            need(
                override.background.photoId,
                frame(`${key}#background`) *
                    Math.max(1, override.background.scale),
            );
        }

        if (override.icon !== undefined && 'photo' in override.icon) {
            need(
                override.icon.photo.photoId,
                frame(`${key}#icon`) * Math.max(1, override.icon.photo.scale),
            );
        }

        for (const layer of override.layers ?? []) {
            if (layer.kind === 'photo') {
                need(
                    layer.photo.photoId,
                    LAYER_FRAME_MM * Math.max(1, layer.photo.scale),
                );
            }
        }
    }

    return needs;
}

/** The size a photo can have for print: the same, or smaller when it has far more pixels than the paper uses. */
export function printSize(
    width: number,
    height: number,
    frameMm: number,
): { width: number; height: number } | null {
    const shortSide = Math.min(width, height);

    if (frameMm <= 0 || shortSide <= 0) {
        return null;
    }

    const needed = Math.ceil(frameMm * PRINT_PX_PER_MM * MARGIN);
    const factor = needed / shortSide;

    if (factor >= WORTH_IT) {
        return null;
    }

    return {
        width: Math.max(1, Math.round(width * factor)),
        height: Math.max(1, Math.round(height * factor)),
    };
}

/**
 * A photo made smaller in this browser before it goes to the server, so a slow connection sends megabytes less
 * (bug 11 of test round 4). Durk waited 142 seconds for two phone photos. A JPEG stays a JPEG, a PNG keeps its
 * transparency; anything that cannot be drawn goes as it is.
 */
export async function downscaleForPrint(
    blob: Blob,
    width: number,
    height: number,
    frameMm: number,
): Promise<Blob> {
    const size = printSize(width, height, frameMm);
    const type =
        blob.type === 'image/png'
            ? 'image/png'
            : blob.type === 'image/jpeg' || blob.type === 'image/webp'
              ? 'image/jpeg'
              : null;

    if (
        size === null ||
        type === null ||
        typeof createImageBitmap === 'undefined' ||
        typeof document === 'undefined'
    ) {
        return blob;
    }

    try {
        // The browser turns the photo upright as it decodes it; the size follows the upright photo.
        const bitmap = await createImageBitmap(blob);
        const upright = printSize(bitmap.width, bitmap.height, frameMm) ?? size;
        const canvas = document.createElement('canvas');
        canvas.width = upright.width;
        canvas.height = upright.height;
        const context = canvas.getContext('2d');

        if (context === null) {
            bitmap.close();

            return blob;
        }

        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, upright.width, upright.height);
        bitmap.close();

        const smaller = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, type, 0.9);
        });

        return smaller !== null && smaller.size < blob.size ? smaller : blob;
    } catch {
        return blob;
    }
}
