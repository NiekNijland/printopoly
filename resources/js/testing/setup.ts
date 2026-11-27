import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { setPage, visit } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';

// A query that waits (findBy, waitFor) gets ten seconds: a busy runner with coverage on is slower than the default second.
configure({ asyncUtilTimeout: 10000 });

// The one fake of @inertiajs/react (docs/guards/frontend.md, Tests): a test sets the page with setPage().
vi.mock('@inertiajs/react', async (importOriginal) => {
    const { fakeInertia } = await import('@/testing/inertia');

    return fakeInertia(await importOriginal());
});
vi.mock('@inertiajs/react/server', async () => {
    const { fakeCreateServer } = await import('@/testing/inertia');

    return { default: fakeCreateServer };
});

beforeEach(() => {
    setPage(fakePage());
    visit.mockReset();
    // What one test keeps in this browser (such as the last chosen currency) must not change the next one.
    if ('Storage' in globalThis) {
        vi.stubGlobal('localStorage', new Storage());
    }
    // No test reads the day it runs: only Date is faked, from the same moment in every test, and it runs on from there.
    vi.useFakeTimers({
        toFake: ['Date'],
        now: new Date('2026-03-14T10:00:00Z'),
        shouldAdvanceTime: true,
    });
});

afterEach(() => {
    vi.useRealTimers();
    cleanup();
});

// A test never reaches the network: a request that no test mocked fails here, with the address, instead of waiting for a
// connection that is refused or never answered.
const blockedFetch = (input: RequestInfo | URL): Promise<Response> => {
    const address =
        typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url;

    return Promise.reject(
        new Error(`The network is blocked in tests: mock fetch for ${address}`),
    );
};

// The other ways out are closed the same way: a request or socket that no test faked fails at once.
const blockedConnection = function blockedConnection(
    address?: string | URL,
): never {
    throw new Error(
        `The network is blocked in tests: fake the connection to ${address === undefined ? 'the server' : String(address)}`,
    );
};
Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: blockedFetch,
});
for (const name of ['XMLHttpRequest', 'WebSocket', 'EventSource']) {
    Object.defineProperty(globalThis, name, {
        configurable: true,
        writable: true,
        value: blockedConnection,
    });
}
