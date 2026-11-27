import { now } from '@/lib/clock';

export class PrintApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
        /** Seconds the server asks to wait before trying again (429), when it says. */
        readonly retryAfter: number | null = null,
    ) {
        super(message);
    }
}

/** The seconds of a `Retry-After` header: a number of seconds or a date. */
export const retryAfterOf = (response: Response): number | null => {
    const header = response.headers.get('Retry-After');

    if (header === null || header.trim() === '') {
        return null;
    }

    const seconds = Number(header);

    if (Number.isFinite(seconds)) {
        return Math.max(1, Math.ceil(seconds));
    }

    const at = Date.parse(header);

    return Number.isNaN(at)
        ? null
        : Math.max(1, Math.ceil((at - now()) / 1000));
};

/** The file name the server sends (`attachment; filename="…"`), else the fallback. */
export const fileNameOf = (
    disposition: string | null,
    fallback: string,
): string => {
    if (disposition === null) {
        return fallback;
    }

    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    if (encoded !== undefined) {
        try {
            return decodeURIComponent(encoded.trim());
        } catch (error) {
            // A broken name falls through to the plain one.
            if (!(error instanceof URIError)) {
                throw error;
            }
        }
    }

    const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1];

    return plain === undefined ? fallback : plain.trim();
};
