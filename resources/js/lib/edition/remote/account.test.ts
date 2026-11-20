import { describe, expect, it, vi } from 'vitest';
import { deleteAccount, logout } from './account';
import { RemoteApiError, createApiClient, type FetchLike } from './client';

function clientFor(response: Response) {
    const fetch = vi.fn<FetchLike>(() => Promise.resolve(response));

    return {
        fetch,
        client: createApiClient({ fetch, getCsrfToken: () => 'csrf' }),
    };
}

const bodyOf = (init: RequestInit | undefined): string =>
    typeof init?.body === 'string' ? init.body : '';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

describe('logout', () => {
    it('posts to /logout and says the local copy has to go', async () => {
        const { client, fetch } = clientFor(
            json({ clearLocalCopy: true, redirect: 'https://x.test/nl' }),
        );

        expect(await logout(client)).toEqual({
            clearLocalCopy: true,
            redirect: 'https://x.test/nl',
        });
        expect(fetch.mock.calls[0]?.[0]).toBe('/logout');
        expect(fetch.mock.calls[0]?.[1]?.method).toBe('POST');
    });

    it('does not clear anything the server did not ask for', async () => {
        const { client } = clientFor(json({}));

        expect(await logout(client)).toEqual({
            clearLocalCopy: false,
            redirect: '/',
        });
    });

    it('throws when the logout fails', async () => {
        const { client } = clientFor(json({}, 422));

        await expect(logout(client)).rejects.toBeInstanceOf(RemoteApiError);
    });
});

describe('deleteAccount', () => {
    it('sends the confirmation and returns where to go', async () => {
        const { client, fetch } = clientFor(
            json({ deleted: true, redirect: '/nl' }),
        );

        expect(await deleteAccount('niek@example.com', client)).toEqual({
            ok: true,
            result: { deleted: true, redirect: '/nl' },
        });
        expect(fetch.mock.calls[0]?.[0]).toBe('/api/account');
        expect(fetch.mock.calls[0]?.[1]?.method).toBe('DELETE');
        expect(JSON.parse(bodyOf(fetch.mock.calls[0]?.[1]))).toEqual({
            confirmation: 'niek@example.com',
        });
    });

    it('hands a wrong confirmation back as a value', async () => {
        const { client } = clientFor(
            json({ errors: { confirmation: ['Dat is niet het adres.'] } }, 422),
        );

        expect(await deleteAccount('wrong', client)).toEqual({
            ok: false,
            reason: 'confirmation',
            message: 'Dat is niet het adres.',
        });
    });

    it('throws on any other failure', async () => {
        const { client } = clientFor(json({}, 404));

        await expect(deleteAccount('x', client)).rejects.toBeInstanceOf(
            RemoteApiError,
        );
    });
});
