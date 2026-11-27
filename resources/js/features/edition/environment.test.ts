import { describe, expect, it, vi } from 'vitest';
import {
    detectEnvironment,
    detectPrivateWindow,
    isChromium,
    isSafari,
    readStorageUsage,
    requestPersistence,
    storageLevel,
    type EnvironmentDeps,
} from './environment';

const MB = 1024 * 1024;

const agents = {
    safariMac:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    safariIos:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    chromeMac:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    chromeIos:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.0.0 Mobile/15E148 Safari/604.1',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    firefox:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0',
    androidChrome:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
};

const deps = (patch: Partial<EnvironmentDeps> = {}): EnvironmentDeps => {
    return {
        userAgent: agents.chromeMac,
        storage: {
            estimate: () =>
                Promise.resolve({ usage: 10 * MB, quota: 10_000 * MB }),
            persisted: () => Promise.resolve(false),
            persist: () => Promise.resolve(true),
        },
        canOpenIndexedDB: () => Promise.resolve(true),
        ...patch,
    };
};

describe('browser detection', () => {
    it('finds Safari on macOS and iOS only', () => {
        expect(isSafari(agents.safariMac)).toBe(true);
        expect(isSafari(agents.safariIos)).toBe(true);
        for (const other of [
            agents.chromeMac,
            agents.chromeIos,
            agents.edge,
            agents.firefox,
            agents.androidChrome,
        ]) {
            expect(isSafari(other)).toBe(false);
        }
    });

    it('finds Chromium browsers', () => {
        expect(isChromium(agents.chromeMac)).toBe(true);
        expect(isChromium(agents.edge)).toBe(true);
        expect(isChromium(agents.chromeIos)).toBe(true);
        expect(isChromium(agents.firefox)).toBe(false);
        expect(isChromium(agents.safariMac)).toBe(false);
    });
});

describe('storage usage', () => {
    it.each([
        [0, 'ok'],
        [0.79, 'ok'],
        [0.8, 'nearly-full'],
        [0.97, 'nearly-full'],
        [0.98, 'full'],
        [1.2, 'full'],
    ] as const)('level at %s is %s', (ratio, level) => {
        expect(storageLevel(ratio)).toBe(level);
    });

    it('reads usage and quota from navigator.storage.estimate', async () => {
        const usage = await readStorageUsage({
            estimate: () => Promise.resolve({ usage: 85, quota: 100 }),
        });
        expect(usage).toEqual({
            usage: 85,
            quota: 100,
            ratio: 0.85,
            level: 'nearly-full',
        });
    });

    it('is null when the browser cannot tell', async () => {
        expect(await readStorageUsage(undefined)).toBeNull();
        expect(await readStorageUsage({})).toBeNull();
        expect(
            await readStorageUsage({ estimate: () => Promise.resolve({}) }),
        ).toBeNull();
        expect(
            await readStorageUsage({
                estimate: () => Promise.resolve({ usage: 1, quota: 0 }),
            }),
        ).toBeNull();
        expect(
            await readStorageUsage({
                estimate: () => Promise.reject(new Error('no')),
            }),
        ).toBeNull();
    });
});

describe('requestPersistence', () => {
    it('asks once and reports the answer', async () => {
        const persist = vi.fn(() => Promise.resolve(true));
        expect(
            await requestPersistence({
                persist,
                persisted: () => Promise.resolve(false),
            }),
        ).toBe('granted');
        expect(persist).toHaveBeenCalledTimes(1);
        expect(
            await requestPersistence({ persist: () => Promise.resolve(false) }),
        ).toBe('denied');
    });

    it('does not ask when already granted', async () => {
        const persist = vi.fn(() => Promise.resolve(true));
        expect(
            await requestPersistence({
                persist,
                persisted: () => Promise.resolve(true),
            }),
        ).toBe('already');
        expect(persist).not.toHaveBeenCalled();
    });

    it('copes with browsers without the API or that throw', async () => {
        expect(await requestPersistence(undefined)).toBe('unsupported');
        expect(await requestPersistence({})).toBe('unsupported');
        expect(
            await requestPersistence({
                persist: () => Promise.reject(new Error('no')),
            }),
        ).toBe('unsupported');
    });
});

describe('detectPrivateWindow', () => {
    it('is true when IndexedDB cannot be opened', async () => {
        expect(
            await detectPrivateWindow(
                deps({ canOpenIndexedDB: () => Promise.resolve(false) }),
            ),
        ).toBe(true);
    });

    it('is true when Chromium reports a small quota', async () => {
        const small = deps({
            storage: {
                estimate: () => Promise.resolve({ usage: 0, quota: 100 * MB }),
            },
        });
        expect(await detectPrivateWindow(small)).toBe(true);
    });

    it('is false for a normal window', async () => {
        expect(await detectPrivateWindow(deps())).toBe(false);
    });

    it('does not take a small quota in other browsers as proof', async () => {
        const firefox = deps({
            userAgent: agents.firefox,
            storage: {
                estimate: () => Promise.resolve({ usage: 0, quota: 50 * MB }),
            },
        });
        expect(await detectPrivateWindow(firefox)).toBe(false);
        expect(await detectPrivateWindow(deps({ storage: undefined }))).toBe(
            false,
        );
    });
});

describe('detectEnvironment', () => {
    it('combines the facts for the save status', async () => {
        const info = await detectEnvironment(
            deps({ userAgent: agents.safariMac }),
        );
        expect(info).toMatchObject({
            privateWindow: false,
            safariEvictionRisk: true,
            persisted: false,
        });
        expect(info.storage?.level).toBe('ok');
    });

    it('has no eviction risk in Safari once the site is persisted', async () => {
        const info = await detectEnvironment(
            deps({
                userAgent: agents.safariMac,
                storage: {
                    estimate: () =>
                        Promise.resolve({ usage: 1, quota: 1000 * MB }),
                    persisted: () => Promise.resolve(true),
                },
            }),
        );
        expect(info).toMatchObject({
            safariEvictionRisk: false,
            persisted: true,
        });
    });

    it('survives a browser without storage APIs', async () => {
        const info = await detectEnvironment({
            userAgent: agents.firefox,
            canOpenIndexedDB: () => Promise.resolve(true),
        });
        expect(info).toEqual({
            privateWindow: false,
            safariEvictionRisk: false,
            persisted: false,
            storage: null,
        });
    });

    it('passes on a nearly full browser', async () => {
        const info = await detectEnvironment(
            deps({
                storage: {
                    estimate: () =>
                        Promise.resolve({
                            usage: 9_000 * MB,
                            quota: 10_000 * MB,
                        }),
                },
            }),
        );
        expect(info.storage?.level).toBe('nearly-full');
    });
});
