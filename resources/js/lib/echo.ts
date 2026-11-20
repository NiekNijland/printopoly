import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import { readPublicConfig } from './public-config';

type ReverbEcho = Echo<'reverb'>;

let instance: ReverbEcho | null | undefined;

/**
 * The Reverb client (B95). It is created on first use and only when the page knows a Reverb key;
 * without one (local development without Reverb) the print page falls back to polling the JSON
 * status endpoint. Private channels are authorised by /broadcasting/auth with the session cookie
 * and the CSRF token from the page.
 */
export function getEcho(): ReverbEcho | null {
    if (instance !== undefined) {
        return instance;
    }

    const { reverb } = readPublicConfig();
    const key = reverb.key;

    if (!key) {
        instance = null;

        return instance;
    }

    const secure = (reverb.scheme ?? 'https') === 'https';
    const port = reverb.port ?? (secure ? 443 : 80);

    // Echo looks for Pusher on window; the Reverb protocol is Pusher-compatible.
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    instance = new Echo({
        broadcaster: 'reverb',
        key,
        wsHost: reverb.host ?? window.location.hostname,
        wsPort: port,
        wssPort: port,
        forceTLS: secure,
        enabledTransports: ['ws', 'wss'],
    });

    return instance;
}
