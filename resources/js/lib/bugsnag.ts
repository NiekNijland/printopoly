import type { Client } from '@bugsnag/js';

import { readPublicConfig } from './public-config';

let client: Client | null = null;

/**
 * Starts Bugsnag in the browser only when the page carries a browser API key (public config). The
 * library is loaded on demand so it costs nothing when it is off. Edition
 * content is never attached to reports (B68).
 */
export const startBugsnag = async (): Promise<void> => {
    const { apiKey, releaseStage } = readPublicConfig().bugsnag;

    if (!apiKey) {
        return;
    }

    const { default: Bugsnag } = await import('@bugsnag/js');

    client = Bugsnag.start({
        apiKey,
        releaseStage: releaseStage ?? 'local',
        enabledReleaseStages: ['production'],
        redactedKeys: ['edition', 'elements', 'photo'],
    });
};

/** Sends an error nobody expected to Bugsnag, when it runs; the page goes on as if nothing happened. */
export const reportError = (error: unknown): void => {
    client?.notify(error instanceof Error ? error : new Error(String(error)));
};

/** A failed request rejects with a TypeError: offline is expected and tried again later, anything else is reported. */
export const reportUnlessOffline = (error: unknown): void => {
    if (!(error instanceof TypeError)) {
        reportError(error);
    }
};

/** An AbortError is the person (or the page) calling the work off, such as a closed share sheet: anything else is reported. */
export const reportUnlessCancelled = (error: unknown): void => {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
        reportError(error);
    }
};

/** For a `.catch` that goes on with a fallback: the failure is reported unless offline, then the fallback is the answer. */
export const reportAndReturn =
    <T>(fallback: T) =>
    (error: unknown): T => {
        reportUnlessOffline(error);

        return fallback;
    };

/** A repair the user never sees, for a developer reading the console; the one place that writes to it. */
export const logWarning = (message: string): void => {
    console.warn(message);
};
