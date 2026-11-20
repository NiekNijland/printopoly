import { readPublicConfig } from './public-config';

/**
 * Starts Bugsnag in the browser only when the page carries a browser API key (public config). The
 * library is loaded on demand so it costs nothing when it is off. Edition
 * content is never attached to reports (B68).
 */
export async function startBugsnag(): Promise<void> {
    const { apiKey, releaseStage } = readPublicConfig().bugsnag;

    if (!apiKey) {
        return;
    }

    const { default: Bugsnag } = await import('@bugsnag/js');

    Bugsnag.start({
        apiKey,
        releaseStage: releaseStage ?? 'local',
        enabledReleaseStages: ['production'],
        redactedKeys: ['edition', 'elements', 'photo'],
    });
}
