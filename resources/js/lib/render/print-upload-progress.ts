import { listenToWindow } from '@/lib/dom-events';

/** Where an upload stands: photos and bytes on the server, and whether it waits for the connection. */
export type UploadProgress = {
    done: number;
    total: number;
    sentBytes: number;
    totalBytes: number;
    /** The connection is gone: the upload goes on by itself once it is back (bug 12 of test round 4). */
    offline: boolean;
};

/** Photos per upload request: one, so progress and a retry are per photo. */
export const PHOTOS_PER_REQUEST = 1;

export const photoBatches = (
    photos: Record<string, Blob>,
): [string, Blob][][] => {
    const entries = Object.entries(photos);
    const batches: [string, Blob][][] = [];

    for (let i = 0; i < entries.length; i += PHOTOS_PER_REQUEST) {
        batches.push(entries.slice(i, i + PHOTOS_PER_REQUEST));
    }

    return batches.length === 0 ? [[]] : batches;
};

export const appendPhotos = (body: FormData, batch: [string, Blob][]): void => {
    for (const [ref, blob] of batch) {
        body.append(`photos[${ref}]`, blob, `${ref}.jpg`);
    }
};

export const trackUpload = (
    photos: Record<string, Blob>,
    onProgress?: (progress: UploadProgress) => void,
) => {
    const total = Object.keys(photos).length;
    const totalBytes = Object.values(photos).reduce(
        (sum, blob) => sum + blob.size,
        0,
    );
    const state: UploadProgress = {
        done: 0,
        total,
        sentBytes: 0,
        totalBytes,
        offline: false,
    };
    const report = (change: Partial<UploadProgress>) => {
        Object.assign(state, change);
        onProgress?.({ ...state });
    };
    const offline = (value: boolean) => {
        if (value !== state.offline) {
            report({ offline: value });
        }
    };
    const sent = (batch: [string, Blob][]) => {
        report({
            done: state.done + batch.length,
            sentBytes:
                state.sentBytes +
                batch.reduce((sum, [, blob]) => sum + blob.size, 0),
        });
    };

    report({});

    return { offline, sent };
};

/** A request that could not reach the server: no connection. A server answer is never this. */
export const isNetworkError = (error: unknown): boolean => {
    return error instanceof TypeError;
};

/** Waits for the browser to say it is online again, or a few seconds, whichever comes first. */
export const waitForConnection = (ms: number): Promise<void> => {
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
