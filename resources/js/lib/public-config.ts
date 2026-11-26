export interface PublicConfig {
    reverb: {
        key: string | null;
        host: string | null;
        port: number | null;
        scheme: string | null;
    };
    bugsnag: { apiKey: string | null; releaseStage: string | null };
}

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
    let parsed: Partial<PublicConfig> = {};

    try {
        const raw = doc?.getElementById('printopoly-config')?.textContent;

        parsed = raw ? (JSON.parse(raw) as Partial<PublicConfig>) : {};
    } catch {
        parsed = {};
    }

    const port = parsed.reverb?.port ?? Number(env.VITE_REVERB_PORT);

    return {
        reverb: {
            key: text(parsed.reverb?.key) ?? text(env.VITE_REVERB_APP_KEY),
            host: text(parsed.reverb?.host) ?? text(env.VITE_REVERB_HOST),
            port: Number.isFinite(port) && port > 0 ? port : null,
            scheme: text(parsed.reverb?.scheme) ?? text(env.VITE_REVERB_SCHEME),
        },
        bugsnag: {
            apiKey:
                text(parsed.bugsnag?.apiKey) ?? text(env.VITE_BUGSNAG_API_KEY),
            releaseStage:
                text(parsed.bugsnag?.releaseStage) ??
                text(env.VITE_BUGSNAG_RELEASE_STAGE),
        },
    };
};
