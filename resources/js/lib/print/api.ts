import type { PhotoRecord } from '@/lib/edition/types';
import { store as storeAsset } from '@/routes/api/editions/assets';
import type {
    PrintJobStatusData,
    PrintPart,
    PrintSet,
} from '@/types/generated';
import type { PhotoTargets } from './photo-targets';

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
    targets?: PhotoTargets,
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
            body: JSON.stringify(
                targets === undefined
                    ? { set, parts }
                    : { set, parts, targets },
            ),
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
    /** The frame size of every visible photo per set, measured from the renderers. */
    targets: PhotoTargets;
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
    const batches = photoBatches(upload.photos);
    const [first = []] = batches;
    const body = new FormData();

    body.append('edition', JSON.stringify(upload.edition));
    body.append('locale', upload.locale);
    body.append('targets', JSON.stringify(upload.targets));

    if (batches.length > 1) {
        body.append('partial', '1');
    }

    appendPhotos(body, first);

    const created = await parse<UploadResult>(
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

    // PHP accepts only `max_file_uploads` files per request (20 by default), so the rest follows in batches.
    for (const batch of batches.slice(1)) {
        const more = new FormData();

        appendPhotos(more, batch);

        await parse(
            await fetch(created.statusUrl.replace(/status$/, 'photos'), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
                body: more,
            }),
        );
    }

    return created;
}

/** Photos per upload request; stays well under PHP's default `max_file_uploads` of 20. */
export const PHOTOS_PER_REQUEST = 10;

export function photoBatches(photos: Record<string, Blob>): [string, Blob][][] {
    const entries = Object.entries(photos);
    const batches: [string, Blob][][] = [];

    for (let i = 0; i < entries.length; i += PHOTOS_PER_REQUEST) {
        batches.push(entries.slice(i, i + PHOTOS_PER_REQUEST));
    }

    return batches.length === 0 ? [[]] : batches;
}

function appendPhotos(body: FormData, batch: [string, Blob][]): void {
    for (const [ref, blob] of batch) {
        body.append(`photos[${ref}]`, blob, `${ref}.jpg`);
    }
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
