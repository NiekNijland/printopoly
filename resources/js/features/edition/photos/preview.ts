import type { PhotoFormat } from '../../../types/photos';
import type { Size } from '../../../types/print';
import {
    HEADER_BYTES,
    MAX_PIXELS,
    photoError,
    validatePhoto,
    type PhotoError,
} from './validation';

/** B61. */
const PREVIEW_LONG_SIDE = 1600;
const PREVIEW_QUALITY = 0.85;

/** Size of the preview: the long side is `longSide` px; small photos are never enlarged. */
export function previewSize(size: Size, longSide = PREVIEW_LONG_SIDE): Size {
    const long = Math.max(size.w, size.h);
    if (long <= longSide) return { w: size.w, h: size.h };
    const k = longSide / long;
    return {
        w: Math.max(1, Math.round(size.w * k)),
        h: Math.max(1, Math.round(size.h * k)),
    };
}

/** A decoded photo, already turned upright by its EXIF orientation. */
export interface DecodedBitmap {
    readonly width: number;
    readonly height: number;
    close(): void;
}

/** Everything that needs a browser or a library, so the flow can be tested without them. */
export interface PreviewDeps {
    /** HEIC to a JPEG or PNG blob (for example `heic-to` or `heic2any`). */
    decodeHeic: (blob: Blob) => Promise<Blob>;
    decodeBitmap: (blob: Blob) => Promise<DecodedBitmap>;
    encodeWebp: (
        bitmap: DecodedBitmap,
        size: Size,
        quality: number,
    ) => Promise<Blob>;
}

export type PreparedPhoto =
    | {
          ok: true;
          format: PhotoFormat;
          /** WebP of at most 1600 px on the long side. */
          preview: Blob;
          previewSize: Size;
          /** Pixel size of the photo after EXIF orientation: the `source` for transforms and dpi. */
          size: Size;
          /** What goes to the server: the original, or the JPEG/PNG made from a HEIC. */
          upload: Blob;
      }
    | { ok: false; error: PhotoError };

export type PrepareStage = 'converting' | 'resizing';

export interface PhotoInput extends Blob {
    readonly name: string;
}

/** Validates, converts HEIC, and makes the preview. Never throws for a bad photo; it returns the error. */
export async function preparePhoto(
    file: PhotoInput,
    deps: PreviewDeps,
    onStage?: (stage: PrepareStage) => void,
): Promise<PreparedPhoto> {
    const head = new Uint8Array(
        await file.slice(0, HEADER_BYTES).arrayBuffer(),
    );
    const checked = validatePhoto({ name: file.name, size: file.size }, head);
    if (!checked.ok) return checked;

    const fail = (): PreparedPhoto => ({
        ok: false,
        error: photoError('unreadable', file.name),
    });
    let upload: Blob = file;
    if (checked.format === 'heic') {
        onStage?.('converting');
        try {
            upload = await deps.decodeHeic(file);
        } catch {
            return fail();
        }
    }

    onStage?.('resizing');
    let bitmap: DecodedBitmap;
    try {
        bitmap = await deps.decodeBitmap(upload);
    } catch {
        return fail();
    }
    try {
        // The header can lie; check again on what was really decoded.
        if (bitmap.width * bitmap.height > MAX_PIXELS)
            return {
                ok: false,
                error: photoError('too-many-pixels', file.name),
            };
        const size = { w: bitmap.width, h: bitmap.height };
        const target = previewSize(size);
        const preview = await deps.encodeWebp(bitmap, target, PREVIEW_QUALITY);
        return {
            ok: true,
            format: checked.format,
            preview,
            previewSize: target,
            size,
            upload,
        };
    } catch {
        return fail();
    } finally {
        bitmap.close();
    }
}

/**
 * Browser implementation: `createImageBitmap` (honours EXIF orientation) and `OffscreenCanvas`.
 * Safari cannot encode WebP from a canvas and silently returns PNG: check `preview.type`.
 */
export function browserPreviewDeps(
    decodeHeic: (blob: Blob) => Promise<Blob>,
): PreviewDeps {
    const bitmaps = new WeakMap<DecodedBitmap, ImageBitmap>();
    return {
        decodeHeic,
        async decodeBitmap(blob) {
            const raw = await createImageBitmap(blob, {
                imageOrientation: 'from-image',
            });
            const wrapped: DecodedBitmap = {
                width: raw.width,
                height: raw.height,
                close: () => raw.close(),
            };
            bitmaps.set(wrapped, raw);
            return wrapped;
        },
        async encodeWebp(bitmap, size, quality) {
            const raw = bitmaps.get(bitmap);
            if (!raw) throw new Error('Unknown bitmap');
            const canvas = new OffscreenCanvas(size.w, size.h);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No 2d context');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(raw, 0, 0, size.w, size.h);
            return canvas.convertToBlob({ type: 'image/webp', quality });
        },
    };
}
