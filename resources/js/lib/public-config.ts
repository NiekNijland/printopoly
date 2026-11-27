import { parseJson } from './json';
import { is, object } from './parse';

export type PublicConfig = {
    reverb: {
        key: string | null;
        host: string | null;
        port: number | null;
        scheme: string | null;
    };
    bugsnag: { apiKey: string | null; releaseStage: string | null };
};

const section = (value: unknown, key: string): Record<string, unknown> => {
    const member = is(object, value) ? value[key] : undefined;

    return is(object, member) ? member : {};
};

const text = (value: unknown): string | null =>
    typeof value === 'string' && value !== '' ? value : null;

/**
 * Reads the JSON the server put in the page (App\Support\PublicConfig). The release is built without the
 * production .env, so `import.meta.env` is empty there and only fills gaps in development.
 */
export const readPublicConfig = (
    doc: Document | undefined = typeof document === 'undefined'
        ? undefined
        : document,
    env: Partial<Record<string, string | undefined>> = import.meta.env,
): PublicConfig => {
    const raw = doc?.getElementById('printopoly-config')?.textContent;
    const parsed = raw ? parseJson(raw) : undefined;
    const reverb = section(parsed, 'reverb');
    const bugsnag = section(parsed, 'bugsnag');
    const port = reverb.port ?? Number(env.VITE_REVERB_PORT);

    return {
        reverb: {
            key: text(reverb.key) ?? text(env.VITE_REVERB_APP_KEY),
            host: text(reverb.host) ?? text(env.VITE_REVERB_HOST),
            port:
                typeof port === 'number' && Number.isFinite(port) && port > 0
                    ? port
                    : null,
            scheme: text(reverb.scheme) ?? text(env.VITE_REVERB_SCHEME),
        },
        bugsnag: {
            apiKey: text(bugsnag.apiKey) ?? text(env.VITE_BUGSNAG_API_KEY),
            releaseStage:
                text(bugsnag.releaseStage) ??
                text(env.VITE_BUGSNAG_RELEASE_STAGE),
        },
    };
};
