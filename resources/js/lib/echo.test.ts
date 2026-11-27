import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configure = (reverb: Record<string, unknown>): void => {
    const script = document.createElement('script');
    script.id = 'printopoly-config';
    script.type = 'application/json';
    script.textContent = JSON.stringify({ reverb });
    document.body.append(script);
};

const fresh = async () => {
    vi.resetModules();

    return import('./echo');
};

beforeEach(() => {
    for (const name of [
        'VITE_REVERB_APP_KEY',
        'VITE_REVERB_HOST',
        'VITE_REVERB_PORT',
        'VITE_REVERB_SCHEME',
    ]) {
        vi.stubEnv(name, '');
    }
});

afterEach(() => {
    vi.unstubAllEnvs();
    document.body.replaceChildren();
});

describe('getEcho', () => {
    it('is nothing without a Reverb key, and stays nothing', async () => {
        const { getEcho } = await fresh();

        expect(getEcho()).toBeNull();

        configure({ key: 'reverb-app' });
        expect(getEcho()).toBeNull();
    });

    it('connects securely on 443 to the host from the page', async () => {
        configure({ key: 'reverb-app', host: 'ws.printopoly.test' });
        const { getEcho } = await fresh();

        const echo = getEcho();

        expect(echo?.options).toMatchObject({
            broadcaster: 'reverb',
            key: 'reverb-app',
            wsHost: 'ws.printopoly.test',
            wsPort: 443,
            wssPort: 443,
            forceTLS: true,
            enabledTransports: ['ws', 'wss'],
        });
        expect(getEcho()).toBe(echo);
        echo?.disconnect();
    });

    it('uses port 80 over plain http and the page host when none is set', async () => {
        configure({ key: 'reverb-app', scheme: 'http' });
        const { getEcho } = await fresh();

        const echo = getEcho();

        expect(echo?.options).toMatchObject({
            wsHost: window.location.hostname,
            wsPort: 80,
            wssPort: 80,
            forceTLS: false,
        });
        echo?.disconnect();
    });

    it('keeps the port the page names', async () => {
        configure({ key: 'reverb-app', port: 8080, scheme: 'http' });
        const { getEcho } = await fresh();

        const echo = getEcho();

        expect(echo?.options).toMatchObject({ wsPort: 8080, wssPort: 8080 });
        echo?.disconnect();
    });
});
