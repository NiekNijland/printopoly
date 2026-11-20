import type { PhotoRecord } from '@/lib/edition/types';
import { store as storeAsset } from '@/routes/api/editions/assets';
import type {
    PrintJobStatusData,
    PrintPart,
    PrintSet,
} from '@/types/generated';

/** The CSRF token the page carries for requests that change something. */
function csrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}

export class PrintApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

async function parse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new PrintApiError(response.status, response.statusText);
    }

    return (await response.json()) as T;
}

export async function fetchStatus(url: string): Promise<PrintJobStatusData> {
    return parse(
        await fetch(url, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        }),
    );
}

/** Starts a run for the chosen parts (B95, B99). A busy job answers 409. */
export async function startRun(
    url: string,
    set: PrintSet,
    parts: PrintPart[],
): Promise<PrintJobStatusData> {
    return parse(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
            },
            credentials: 'same-origin',
            body: JSON.stringify({ set, parts }),
        }),
    );
}

export interface UploadResult {
    token: string;
    url: string;
    statusUrl: string;
}

export interface LocalEditionUpload {
    /** The edition JSON the print pipeline reads. */
    edition: unknown;
    /** The photos the edition places, by the id the edition JSON uses. */
    photos: Record<string, Blob>;
    locale: string;
}

/**
 * A job without an account (B80): sends the edition and the photos it needs, once, for this job.
 * The server answers with the secret link of the job.
 */
export async function uploadPrintJob(
    upload: LocalEditionUpload,
    url: string,
): Promise<UploadResult> {
    const body = new FormData();

    body.append('edition', JSON.stringify(upload.edition));
    body.append('locale', upload.locale);

    for (const [ref, blob] of Object.entries(upload.photos)) {
        body.append(`photos[${ref}]`, blob, `${ref}.jpg`);
    }

    return parse(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
            },
            credentials: 'same-origin',
            body,
        }),
    );
}

/**
 * Sends one photo of a local edition to the account (B61, B78): the server makes the preview and the print
 * source and keeps no original. It is the `uploadPhoto` hook of the remote edition store. The photo id is
 * the ref the edition JSON uses for the photo.
 */
export async function uploadAccountPhoto(photo: PhotoRecord): Promise<void> {
    const body = new FormData();

    body.append('ref', photo.id);
    body.append('photo', photo.blob, photo.fileName ?? `${photo.id}.jpg`);

    const response = await fetch(storeAsset({ edition: photo.editionId }).url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken() },
        credentials: 'same-origin',
        body,
    });

    if (!response.ok) {
        throw new PrintApiError(response.status, response.statusText);
    }
}
