import type { Locale, Localized } from '../../../types/game';
import type { PhotoFormat } from '../../../types/photos';
import { detectFormat, readDimensions } from './format';

/** B70. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
/** B69. */
export const MAX_PIXELS = 60_000_000;
/** How much of the file `validatePhoto` needs: enough for the header behind large EXIF blocks. */
export const HEADER_BYTES = 4 * 1024 * 1024;

export type PhotoErrorCode =
    'unsupported-type' | 'too-large' | 'too-many-pixels' | 'unreadable';

export interface PhotoFileInfo {
    name: string;
    size: number;
}

export interface PhotoError {
    code: PhotoErrorCode;
    fileName: string;
    /** The sentence after the file name, as in the design (Staten). */
    rest: Localized;
}

export type PhotoValidation =
    | { ok: true; format: PhotoFormat; width: number; height: number }
    | { ok: false; error: PhotoError };

const REST: Record<PhotoErrorCode, Localized> = {
    'unsupported-type': {
        nl: 'kan niet: kies een JPEG, PNG, WebP of HEIC.',
        en: "can't be used: choose a JPEG, PNG, WebP or HEIC.",
    },
    'too-large': {
        nl: 'is groter dan 25 MB. Kies een kleinere versie.',
        en: 'is larger than 25 MB. Choose a smaller version.',
    },
    'too-many-pixels': {
        nl: 'heeft meer dan 60 megapixel. Kies een kleinere versie.',
        en: 'has more than 60 megapixels. Choose a smaller version.',
    },
    unreadable: {
        nl: 'is niet te lezen. Kies een ander bestand.',
        en: "can't be read. Choose another file.",
    },
};

export function photoError(code: PhotoErrorCode, fileName: string): PhotoError {
    return { code, fileName, rest: REST[code] };
}

/** "strand.jpg is groter dan 25 MB. Kies een kleinere versie." (the UI bolds the name itself). */
export function formatPhotoError(error: PhotoError, locale: Locale): string {
    return `${error.fileName} ${error.rest[locale]}`;
}

/**
 * Checks a file before anything is decoded: type by magic bytes, size, then pixel count from the
 * header. `head` holds the first bytes of the file (`HEADER_BYTES`, or all of it when smaller).
 */
export function validatePhoto(
    file: PhotoFileInfo,
    head: Uint8Array,
): PhotoValidation {
    const fail = (code: PhotoErrorCode): PhotoValidation => ({
        ok: false,
        error: photoError(code, file.name),
    });

    if (file.size <= 0 || head.length === 0) return fail('unreadable');
    const format = detectFormat(head);
    if (!format) return fail('unsupported-type');
    if (file.size > MAX_FILE_BYTES) return fail('too-large');
    const dims = readDimensions(head, format);
    if (!dims) return fail('unreadable');
    if (dims.w * dims.h > MAX_PIXELS) return fail('too-many-pixels');
    return { ok: true, format, width: dims.w, height: dims.h };
}
