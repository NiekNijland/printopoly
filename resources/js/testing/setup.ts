import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
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
globalThis.fetch = (input: RequestInfo | URL): Promise<Response> =>
    Promise.reject(
        new Error(`The network is blocked in tests: mock fetch for ${String(input)}`),
    );
