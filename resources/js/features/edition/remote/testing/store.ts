import { vi } from 'vitest';

import type { Edition, PhotoRecord } from '@/lib/render/edition-types';
import { makeEdition } from '@/testing/edition-test-utils';

import { createApiClient, type FetchLike } from '../client';
import { createRemoteEditionStore } from '../store';

export const json = (body: unknown, status = 200) => {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
};

export const setup = (...responses: Response[]) => {
    const queue = [...responses];
    const fetch = vi.fn<FetchLike>(() => {
        const next = queue.shift();
        if (next === undefined) {
            return Promise.reject(new Error('No response queued'));
        }

        return Promise.resolve(next);
    });
    const uploadPhoto = vi.fn<(photo: PhotoRecord) => Promise<void>>(() =>
        Promise.resolve(),
    );
    const store = createRemoteEditionStore({
        client: createApiClient({ fetch, getCsrfToken: () => 'csrf' }),
        uploadPhoto,
    });

    return { store, fetch, uploadPhoto };
};

export const sentBody = (
    fetch: ReturnType<typeof setup>['fetch'],
    call = 0,
): unknown => {
    const init = fetch.mock.calls[call]?.[1];

    return JSON.parse(typeof init?.body === 'string' ? init.body : '');
};

export const urlOf = (
    fetch: ReturnType<typeof setup>['fetch'],
    call = 0,
): string => {
    return fetch.mock.calls[call]?.[0] ?? '';
};

export const edition = (overrides: Partial<Edition> = {}): Edition => ({
    ...makeEdition({ id: 'e1' }),
    ...overrides,
});
