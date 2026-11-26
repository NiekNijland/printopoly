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

beforeEach(() => {
    setPage(fakePage());
    visit.mockReset();
    // No test reads the day it runs: the clock starts at the same moment in every test and runs on from there. Only Date
    // is faked; a test that needs to move timers fakes them itself.
    vi.useFakeTimers({
        toFake: ['Date'],
        now: new Date('2026-03-14T10:00:00Z'),
        shouldAdvanceTime: true,
    });
});

afterEach(() => {
    vi.useRealTimers();
    cleanup();
    // What one test keeps in this browser (such as the last chosen currency) must not change the next one.
    try {
        window.localStorage.clear();
    } catch {
        // A test without a window.
    }
});

// A test never reaches the network: a request that no test mocked fails here, with the address, instead of waiting for a
// connection that is refused or never answered.
globalThis.fetch = (input: RequestInfo | URL): Promise<Response> => {
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
for (const name of ['XMLHttpRequest', 'WebSocket', 'EventSource']) {
    Object.defineProperty(globalThis, name, {
        configurable: true,
        writable: true,
        value: blockedConnection,
    });
}
