import { reportUnlessOffline } from '@/lib/bugsnag';
import { listenToWindow } from '@/lib/dom-events';
import type { EditionStorage } from '@/lib/render/edition-storage';
import type { PhotoRecord } from '@/lib/render/edition-types';
import { store as storeAsset } from '@/routes/api/editions/assets';
import { status as statusRoute } from '@/routes/print';
import type {
    BoardForm,
    PrintJobReadyData,
    PrintJobStatusData,
    PrintPart,
    PrintSet,
} from '@/types/generated';
import { PrintApiError, fileNameOf, retryAfterOf } from './print-api-error';
import type { MoneyAmount } from './print-money';
import type { PhotoTargets } from './print-photo-targets';
import {
    appendPhotos,
    photoBatches,
    trackUpload,
    type UploadProgress,
} from './print-upload-progress';

/** The CSRF token the page carries for requests that change something. */
const csrfToken = (): string => {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
};

const parse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
        throw new PrintApiError(
            response.status,
            response.statusText,
            retryAfterOf(response),
        );
    }

    return (await response.json()) as T;
};

/** What the page chose for one set (bug 6 of test round 3, B156): only the fields sent change on the server. */
export type SetChoice = {
    skipped?: PrintPart[];
    moneyAmount?: MoneyAmount | null;
    copies?: number;
    /** How the print shop delivers the board (B243). */
    boardForm?: BoardForm;
    /** How many invitations the set counts with (B244). */
    invitations?: number;
};

/** Keeps the choices of one set on the job, and answers with the status (the money may be outdated now). */
export const saveChoices = async (
    url: string,
    set: PrintSet,
    choice: SetChoice,
): Promise<PrintJobStatusData> => {
    return parse(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
            },
            credentials: 'same-origin',
            body: JSON.stringify({ set, ...choice }),
        }),
    );
};

/**
 * A job this browser already made for this edition at this revision, that the server still has (bug 9 of test
 * round 3): printing again from Mijn edities or after a reload opens it instead of uploading a new copy. Newest
 * first. Never throws: without one the page uploads as before.
 */
export const findReusableJob = async (
    editionId: string,
    revision: number,
    storage: Pick<EditionStorage, 'listPrintJobs'>,
): Promise<string | null> => {
    try {
        const jobs = (await storage.listPrintJobs())
            .filter(
                (job) =>
                    job.editionId === editionId && job.revision === revision,
            )
            .sort((a, b) => b.createdAt - a.createdAt);

        for (const job of jobs) {
            const response = await fetch(statusRoute(job.token).url, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (response.ok) {
                return job.token;
            }
        }
    } catch (error) {
        // Offline or storage gone: upload as before.
        reportUnlessOffline(error);
    }

    return null;
};

/**
 * The newest job this browser made for an edition, whatever its revision (UX 3 of test round 4): a new job for a
 * changed edition takes over the PDFs that did not change from it. Never throws.
 */
export const previousJobToken = async (
    editionId: string,
    storage: Pick<EditionStorage, 'listPrintJobs'>,
): Promise<string | null> => {
    try {
        const [latest] = (await storage.listPrintJobs())
            .filter((job) => job.editionId === editionId)
            .sort((a, b) => b.createdAt - a.createdAt);

        return latest?.token ?? null;
    } catch {
        return null;
    }
};

export const fetchStatus = async (url: string): Promise<PrintJobStatusData> => {
    return parse(
        await fetch(url, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        }),
    );
};

/**
 * Starts a run for the chosen parts (B95, B99). A busy job answers 409. `locale` is the language of the site: the
 * instructions and the file names follow it, whatever the language of the edition (B184).
 */
export const startRun = async (
    url: string,
    set: PrintSet,
    parts: PrintPart[],
    targets?: PhotoTargets,
    choices?: SetChoice,
    locale?: string,
): Promise<PrintJobStatusData> => {
    return parse(
        await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                set,
                parts,
                ...(targets === undefined ? {} : { targets }),
                ...(choices === undefined ? {} : { choices }),
                ...(locale === undefined ? {} : { locale }),
            }),
        }),
    );
};

export type UploadResult = {
    token: string;
    url: string;
    statusUrl: string;
};

export type LocalEditionUpload = {
    /** The edition JSON the print pipeline reads. */
    edition: unknown;
    /** The photos the edition places, by the id the edition JSON uses. */
    photos: Record<string, Blob>;
    /** The frame size of every visible photo per set, measured from the renderers. */
    targets: PhotoTargets;
    /** The language of the site: instructions, file names and the link follow it (B184). */
    locale: string;
    /**
     * The job this browser made for an earlier version of the edition: the server takes over the PDFs that did
     * not change, so only what changed is made again (UX 3 of test round 4).
     */
    previous?: string | null;
};

/** How long an upload keeps waiting for the connection before it gives up. */
const OFFLINE_PATIENCE_MS = 10 * 60 * 1000;

/** A request that could not reach the server: no connection. A server answer is never this. */
const isNetworkError = (error: unknown): boolean => {
    return error instanceof TypeError;
};

/** Waits for the browser to say it is online again, or a few seconds, whichever comes first. */
const waitForConnection = (ms: number): Promise<void> => {
    return new Promise((resolve) => {
        const done = () => {
            stopListening();
            window.clearTimeout(timer);
            resolve();
        };
        const timer = window.setTimeout(done, ms);

        const stopListening = listenToWindow('online', done);
    });
};

/**
 * Posts a form and tries again when the connection drops (bug 12 of test round 4): Durk lost his network while
 * printing and got a generic error. The request is sent again as soon as the browser is online, up to ten minutes.
 */
const postForm = async <T>(
    url: string,
    body: () => FormData,
    onOffline: (offline: boolean) => void,
): Promise<T> => {
    const started = Date.now();

    for (let attempt = 0; ; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
                body: body(),
            });

            onOffline(false);

            return await parse<T>(response);
        } catch (error) {
            // One request per photo can meet the limit of the photo route: wait as long as the server asks.
            if (
                error instanceof PrintApiError &&
                error.status === 429 &&
                attempt < 5 &&
                url.endsWith('/photos')
            ) {
                await new Promise((resolve) =>
                    window.setTimeout(
                        resolve,
                        Math.min(60, error.retryAfter ?? 10) * 1000,
                    ),
                );
                continue;
            }

            if (
                !isNetworkError(error) ||
                Date.now() - started > OFFLINE_PATIENCE_MS
            ) {
                throw error;
            }

            onOffline(true);
            await waitForConnection(Math.min(15000, 1000 * 2 ** attempt));
        }
    }
};

/**
 * A job without an account (B80): sends the edition and the photos it needs, once, for this job. The server
 * answers with the secret link of the job. Every photo goes in its own request, so the progress counts each photo
 * and its bytes, and a dropped connection only repeats one photo (bug 11 and 12 of test round 4).
 */
export const uploadPrintJob = async (
    upload: LocalEditionUpload,
    url: string,
    onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> => {
    const batches = photoBatches(upload.photos);
    const [first = []] = batches;
    const { offline, sent } = trackUpload(upload.photos, onProgress);

    const created = await postForm<UploadResult>(
        url,
        () => {
            const body = new FormData();

            body.append('edition', JSON.stringify(upload.edition));
            body.append('locale', upload.locale);
            body.append('targets', JSON.stringify(upload.targets));

            if (typeof upload.previous === 'string' && upload.previous !== '') {
                body.append('previous', upload.previous);
            }

            if (batches.length > 1) {
                body.append('partial', '1');
            }

            appendPhotos(body, first);

            return body;
        },
        offline,
    );

    sent(first);

    for (const batch of batches.slice(1)) {
        await postForm(
            created.statusUrl.replace(/status$/, 'photos'),
            () => {
                const more = new FormData();

                appendPhotos(more, batch);

                return more;
            },
            offline,
        );
        sent(batch);
    }

    return created;
};

/**
 * Sends one photo of a local edition to the account (B61, B78): the server makes the preview and the print
 * source and keeps no original. It is the `uploadPhoto` hook of the remote edition store. The photo id is
 * the ref the edition JSON uses for the photo.
 */
export const uploadAccountPhoto = async (photo: PhotoRecord): Promise<void> => {
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
};

/**
 * Asks what is ready for the print jobs this browser kept next to its editions (bug 14 of the integration check).
 * The tokens go in the body, never in the address. Only jobs with files come back.
 */
export const fetchPrintJobsReady = async (
    url: string,
    tokens: readonly string[],
): Promise<PrintJobReadyData[]> => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ tokens }),
    });

    return (await parse<{ jobs: PrintJobReadyData[] }>(response)).jobs;
};

/** One file of a print set as a File to share: the name the server sends, else `name`; `type` when the server sends none. */
export const fetchSetFile = async (
    url: string,
    name: string,
    type = 'application/pdf',
): Promise<File> => {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}`);
    }
    const blob = await response.blob();

    return new File(
        [blob],
        fileNameOf(response.headers.get('Content-Disposition'), name),
        { type: blob.type === '' ? type : blob.type },
    );
};
