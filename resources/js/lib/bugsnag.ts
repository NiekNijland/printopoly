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
