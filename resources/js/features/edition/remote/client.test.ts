import { describe, expect, it, vi } from 'vitest';
import {
    RemoteApiError,
    RemoteAuthError,
    RemoteRateLimitError,
    createApiClient,
    type ApiClientOptions,
} from './client';

type FetchLike = NonNullable<ApiClientOptions['fetch']>;

const json = (body: unknown, status = 200, headers: HeadersInit = {}) => {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });
};

const mockFetch = (response: Response | (() => Response)) => {
    return vi.fn<FetchLike>(() =>
        Promise.resolve(typeof response === 'function' ? response() : response),
    );
};

describe('createApiClient', () => {
    it('asks for JSON, sends the session cookie and the CSRF token', async () => {
        const fetch = mockFetch(json({ ok: true }));
        const client = createApiClient({
            fetch,
            getCsrfToken: () => 'token-1',
        });

        const response = await client.request('PATCH', '/api/editions/e1', {
            baseRevision: 1,
        });

        expect(response).toEqual({
            status: 200,
            ok: true,
            body: { ok: true },
        });
        const [url, init] = fetch.mock.calls[0] ?? [];
        expect(url).toBe('/api/editions/e1');
        expect(init?.method).toBe('PATCH');
        expect(init?.credentials).toBe('same-origin');
        expect(init?.body).toBe('{"baseRevision":1}');
        expect(init?.headers).toEqual({
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': 'token-1',
            'Content-Type': 'application/json',
        });
    });

    it('sends no body and no content type for a GET, and no token when there is none', async () => {
        const fetch = mockFetch(json({}));
        const client = createApiClient({
            fetch,
            baseUrl: 'https://printopoly.test',
            getCsrfToken: () => undefined,
        });

        await client.request('GET', '/api/editions');

        const [url, init] = fetch.mock.calls[0] ?? [];
        expect(url).toBe('https://printopoly.test/api/editions');
        expect(init?.body).toBeUndefined();
        expect(init?.headers).toEqual({
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        });
    });

    it('returns the statuses the callers handle themselves', async () => {
        for (const status of [404, 409, 422]) {
            const client = createApiClient({
                fetch: mockFetch(json({ code: 'x' }, status)),
            });
            const response = await client.request('GET', '/x');
            expect(response.status).toBe(status);
            expect(response.ok).toBe(false);
        }
    });

    it('has no body for an empty answer or one that is not JSON', async () => {
        const empty = createApiClient({
            fetch: mockFetch(() => new Response(null, { status: 204 })),
        });
        expect((await empty.request('DELETE', '/x')).body).toBeUndefined();

        const html = createApiClient({
            fetch: mockFetch(
                () => new Response('<html></html>', { status: 404 }),
            ),
        });
        expect((await html.request('GET', '/x')).body).toBeUndefined();
    });

    it.each([401, 419])('throws RemoteAuthError on %i', async (status) => {
        const client = createApiClient({
            fetch: mockFetch(json({ message: 'Unauthenticated.' }, status)),
        });

        await expect(client.request('GET', '/x')).rejects.toBeInstanceOf(
            RemoteAuthError,
        );
    });

    it('throws RemoteRateLimitError with the wait on 429', async () => {
        const client = createApiClient({
            fetch: mockFetch(json({}, 429, { 'Retry-After': '12' })),
        });

        const error = await client
            .request('GET', '/x')
            .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(RemoteRateLimitError);
        expect(error).toHaveProperty('retryAfterSeconds', 12);
    });

    it('has no wait when Retry-After is missing', async () => {
        const client = createApiClient({ fetch: mockFetch(json({}, 429)) });

        const error = await client
            .request('GET', '/x')
            .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(RemoteRateLimitError);
        expect(error).toHaveProperty('retryAfterSeconds', undefined);
    });

    it('throws RemoteApiError on a server error and keeps the status', async () => {
        const client = createApiClient({ fetch: mockFetch(json({}, 503)) });

        const error = await client
            .request('GET', '/x')
            .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(RemoteApiError);
        expect(error).toHaveProperty('status', 503);
    });

    it('lets a network failure through unchanged', async () => {
        const failure = new TypeError('Failed to fetch');
        const client = createApiClient({
            fetch: () => Promise.reject(failure),
        });

        await expect(client.request('GET', '/x')).rejects.toBe(failure);
    });
});

describe('the CSRF token from the cookie', () => {
    it('reads and decodes the Laravel cookie', async () => {
        document.cookie = 'other=1';
        document.cookie = `XSRF-TOKEN=${encodeURIComponent('a=b/c')}`;
        const fetch = mockFetch(json({}));

        await createApiClient({ fetch }).request('GET', '/x');

        expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
            'X-XSRF-TOKEN': 'a=b/c',
        });
    });
});
