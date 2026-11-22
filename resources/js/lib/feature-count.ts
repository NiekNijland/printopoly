import { count } from '@/routes/feature';

/**
 * The anonymous feature counter (B206). The events that happen only in the browser go to the server as a bare name:
 * no cookies, no edition, no id. The server adds one to the counter of that event for today, and that is all it
 * keeps. Counting never gets in the way: it does not wait and swallows every failure. The same names as
 * `FeatureEvent::fromBrowser()` in app/Enums/FeatureEvent.php.
 */
export type FeatureEvent =
    'edition_created' | 'template_chosen' | 'photo_added';

export function countFeature(event: FeatureEvent): void {
    // Tests count nothing: there is no server to tell.
    if (
        typeof window === 'undefined' ||
        typeof fetch !== 'function' ||
        import.meta.env.MODE === 'test'
    ) {
        return;
    }

    try {
        void fetch(count().url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event }),
            // No cookies go along, and the count still arrives when the page closes right after.
            credentials: 'omit',
            keepalive: true,
        }).catch(() => undefined);
    } catch {
        // Counting is never worth an error.
    }
}
