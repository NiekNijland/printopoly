/**
 * Starts Bugsnag in the browser only when VITE_BUGSNAG_API_KEY is set. The
 * library is loaded on demand so it costs nothing when it is off. Edition
 * content is never attached to reports (B68).
 */
export async function startBugsnag(): Promise<void> {
    const apiKey = import.meta.env.VITE_BUGSNAG_API_KEY;

    if (!apiKey) {
        return;
    }

    const { default: Bugsnag } = await import('@bugsnag/js');

    Bugsnag.start({
        apiKey,
        releaseStage: import.meta.env.VITE_BUGSNAG_RELEASE_STAGE || 'local',
        enabledReleaseStages: ['production'],
        redactedKeys: ['edition', 'elements', 'photo'],
    });
}
