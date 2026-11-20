import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

type ReverbEcho = Echo<'reverb'>;

let instance: ReverbEcho | null | undefined;

/**
 * The Reverb client (B95). It is created on first use and only when the build knows a Reverb key;
 * without one (local development without Reverb) the print page falls back to polling the JSON
 * status endpoint. Private channels are authorised by /broadcasting/auth with the session cookie
 * and the CSRF token from the page.
 */
export function getEcho(): ReverbEcho | null {
    if (instance !== undefined) {
        return instance;
    }

    const key = import.meta.env.VITE_REVERB_APP_KEY;

    if (!key) {
        instance = null;

        return instance;
    }

    const secure = (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https';
    const port = Number(
        import.meta.env.VITE_REVERB_PORT ?? (secure ? 443 : 80),
    );

    // Echo looks for Pusher on window; the Reverb protocol is Pusher-compatible.
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    instance = new Echo({
        broadcaster: 'reverb',
        key,
        wsHost: import.meta.env.VITE_REVERB_HOST ?? window.location.hostname,
        wsPort: port,
        wssPort: port,
        forceTLS: secure,
        enabledTransports: ['ws', 'wss'],
    });

    return instance;
}
