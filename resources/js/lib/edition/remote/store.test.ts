import { describe, expect, it, vi } from 'vitest';
import { uploadEditions } from '../sync';
import { makeEdition, photo } from '../test-utils';
import type { Edition, PhotoRecord } from '../types';
import {
    RemoteApiError,
    RemoteAuthError,
    createApiClient,
    type FetchLike,
} from './client';
import { createRemoteEditionStore } from './store';

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function setup(...responses: Response[]) {
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
}

function sentBody(fetch: ReturnType<typeof setup>['fetch'], call = 0): unknown {
    const init = fetch.mock.calls[call]?.[1];

    return JSON.parse(typeof init?.body === 'string' ? init.body : '');
}

function urlOf(fetch: ReturnType<typeof setup>['fetch'], call = 0): string {
    return fetch.mock.calls[call]?.[0] ?? '';
}

const edition = (overrides: Partial<Edition> = {}): Edition => ({
    ...makeEdition({ id: 'e1' }),
    ...overrides,
});

describe('list and get', () => {
    it('lists the account editions with the limit', async () => {
        const { store, fetch } = setup(
            json({
                editions: [
                    {
                        id: 'a',
                        name: 'A',
                        language: 'nl',
                        theme: 'classic',
                        revision: 3,
                        createdAt: 1,
                        updatedAt: 9,
                    },
                ],
                limit: 20,
            }),
        );

        expect(await store.list()).toEqual([
            { id: 'a', name: 'A', revision: 3, updatedAt: 9 },
        ]);
        expect(urlOf(fetch)).toBe('/api/editions');
    });

    it('reports the limit next to the list', async () => {
        const { store } = setup(json({ editions: [], limit: 20 }));

        expect(await store.listWithLimit()).toEqual({
            editions: [],
            limit: 20,
        });
    });

    it('rejects a list that is not what the server promises', async () => {
        const { store } = setup(json({ editions: [{ id: 1 }], limit: 20 }));

        await expect(store.list()).rejects.toThrow('invalid edition summary');
    });

    it('gets an edition and checks it with the schema', async () => {
        const server = edition({ revision: 4, name: 'Van de server' });
        const { store, fetch } = setup(json({ edition: server }));

        expect(await store.get('e 1')).toEqual(server);
        expect(urlOf(fetch)).toBe('/api/editions/e%201');
    });

    it('returns undefined for an edition that is not there', async () => {
        const { store } = setup(json({ message: 'Not found' }, 404));

        expect(await store.get('nope')).toBeUndefined();
    });

    it('refuses an edition that cannot be read at all', async () => {
        const { store } = setup(json({ edition: { id: 'e1' } }));

        await expect(store.get('e1')).rejects.toThrow('cannot be read');
    });

    it('repairs an account edition with amounts out of range instead of refusing it (round 4, bug 1)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const broken = edition({
            elements: {
                'space.01': { name: 'Kaperspad', amounts: { price: 120 } },
                'space.06': { name: 'Ankerbaai', amounts: { price: 70 } },
            },
        });
        const { store } = setup(json({ edition: broken }));

        const read = await store.get('e1');

        expect(read?.elements['space.01']).toEqual({
            name: 'Kaperspad',
            amounts: { price: 72 },
        });
        expect(read?.elements['space.06']).toEqual({
            name: 'Ankerbaai',
            amounts: { price: 80 },
        });
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('was repaired'),
        );
        warn.mockRestore();
    });

    it('surfaces a session that ended', async () => {
        const { store } = setup(json({ message: 'Unauthenticated.' }, 401));

        await expect(store.list()).rejects.toBeInstanceOf(RemoteAuthError);
    });
});

describe('put', () => {
    it('creates a new edition with POST and reports the revision', async () => {
        const local = edition({ revision: 7 });
        const { store, fetch } = setup(json({ edition: local }, 201));

        expect(await store.put(local, null)).toEqual({ ok: true, revision: 7 });
        expect(fetch.mock.calls[0]?.[1]?.method).toBe('POST');
        expect(urlOf(fetch)).toBe('/api/editions');
        expect(sentBody(fetch)).toEqual(local);
    });

    it('turns a 409 on create into a conflict with the server summary', async () => {
        const server = edition({ revision: 3, name: 'Server' });
        const { store } = setup(
            json({ code: 'conflict', current: server }, 409),
        );

        expect(await store.put(edition(), null)).toEqual({
            ok: false,
            reason: 'conflict',
            current: {
                id: 'e1',
                name: 'Server',
                revision: 3,
                updatedAt: 1_000,
            },
        });
    });

    it('reports a full account as the limit', async () => {
        const { store } = setup(
            json({ code: 'edition_limit', limit: 20, message: 'x' }, 422),
        );

        expect(await store.put(edition(), null)).toEqual({
            ok: false,
            reason: 'limit',
        });
    });

    it('replaces with PUT against the expected revision', async () => {
        const local = edition({ revision: 6 });
        const { store, fetch } = setup(json({ revision: 6, updatedAt: 99 }));

        expect(await store.put(local, 2)).toEqual({ ok: true, revision: 6 });
        expect(fetch.mock.calls[0]?.[1]?.method).toBe('PUT');
        expect(urlOf(fetch)).toBe('/api/editions/e1');
        expect(sentBody(fetch)).toEqual({ ...local, baseRevision: 2 });
    });

    it('turns a 409 on replace into a conflict', async () => {
        const { store } = setup(
            json({ code: 'conflict', current: edition({ revision: 5 }) }, 409),
        );

        const result = await store.put(edition({ revision: 6 }), 4);

        expect(result).toMatchObject({
            ok: false,
            reason: 'conflict',
            current: { revision: 5 },
        });
    });

    it('throws on a validation error, with what the server said', async () => {
        const { store } = setup(
            json({ errors: { edition: ['theme: unknown theme'] } }, 422),
        );

        const error = await store.put(edition(), null).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(RemoteApiError);
        expect((error as RemoteApiError).status).toBe(422);
        expect((error as RemoteApiError).body).toEqual({
            errors: { edition: ['theme: unknown theme'] },
        });
    });
});

describe('patch and rename', () => {
    it('sends the patch and returns the new revision', async () => {
        const { store, fetch } = setup(json({ revision: 5, updatedAt: 42 }));
        const patch = {
            baseRevision: 4,
            theme: 'riso' as const,
            elements: { 'space.01': { name: 'Stadspark' }, 'space.02': null },
        };

        expect(await store.patch('e1', patch)).toEqual({
            ok: true,
            revision: 5,
            updatedAt: 42,
        });
        expect(fetch.mock.calls[0]?.[1]?.method).toBe('PATCH');
        expect(urlOf(fetch)).toBe('/api/editions/e1');
        expect(sentBody(fetch)).toEqual(patch);
    });

    it('returns the server version on a revision conflict instead of overwriting', async () => {
        const server = edition({ revision: 9, name: 'Ander venster' });
        const { store } = setup(
            json({ code: 'conflict', current: server }, 409),
        );

        expect(await store.patch('e1', { baseRevision: 4, name: 'x' })).toEqual(
            {
                ok: false,
                reason: 'conflict',
                current: server,
            },
        );
    });

    it('says missing for an edition that is gone', async () => {
        const { store } = setup(json({}, 404));

        expect(await store.patch('e1', { baseRevision: 0, name: 'x' })).toEqual(
            {
                ok: false,
                reason: 'missing',
            },
        );
    });

    it('renames with the base revision', async () => {
        const { store, fetch } = setup(
            json({ revision: 2, updatedAt: 5, name: 'Nieuw' }),
        );

        expect(await store.rename('e1', 'Nieuw', 1)).toEqual({
            ok: true,
            revision: 2,
            updatedAt: 5,
        });
        expect(urlOf(fetch)).toBe('/api/editions/e1/name');
        expect(sentBody(fetch)).toEqual({ name: 'Nieuw', baseRevision: 1 });
    });

    it('throws on a patch that the server finds invalid', async () => {
        const { store } = setup(json({ errors: {} }, 422));

        await expect(
            store.patch('e1', { baseRevision: 0, name: 'x' }),
        ).rejects.toBeInstanceOf(RemoteApiError);
    });
});

describe('duplicate and delete', () => {
    it('duplicates and returns the copy', async () => {
        const copy = edition({ id: 'copy-1', name: 'Zaterdagclub (kopie)' });
        const { store, fetch } = setup(json({ edition: copy }, 201));

        expect(await store.duplicate('e1')).toEqual({
            ok: true,
            edition: copy,
        });
        expect(urlOf(fetch)).toBe('/api/editions/e1/duplicate');
        expect(fetch.mock.calls[0]?.[1]?.body).toBeUndefined();
    });

    it('sends a name when there is one', async () => {
        const { store, fetch } = setup(json({ edition: edition() }, 201));

        await store.duplicate('e1', 'Eigen naam');

        expect(sentBody(fetch)).toEqual({ name: 'Eigen naam' });
    });

    it('reports the limit and a missing edition', async () => {
        const full = setup(json({ code: 'edition_limit', limit: 20 }, 422));
        expect(await full.store.duplicate('e1')).toEqual({
            ok: false,
            reason: 'limit',
            limit: 20,
        });

        const gone = setup(json({}, 404));
        expect(await gone.store.duplicate('e1')).toEqual({
            ok: false,
            reason: 'missing',
        });
    });

    it('deletes, and treats an edition that is already gone as deleted', async () => {
        const { store, fetch } = setup(
            new Response(null, { status: 204 }),
            json({}, 404),
        );

        await store.delete('e1');
        await store.delete('e1');

        expect(fetch.mock.calls[0]?.[1]?.method).toBe('DELETE');
        expect(urlOf(fetch, 1)).toBe('/api/editions/e1');
    });

    it('throws when a delete fails for another reason', async () => {
        const { store } = setup(json({}, 422));

        await expect(store.delete('e1')).rejects.toBeInstanceOf(RemoteApiError);
    });
});

describe('importEditions', () => {
    it('sends the editions and reads the report', async () => {
        const { store, fetch } = setup(
            json({
                imported: ['a'],
                conflicts: ['b'],
                overLimit: ['c'],
                invalid: { d: ['language: must be "nl" or "en"'] },
            }),
        );
        const editions = [
            edition({ id: 'a' }),
            edition({ id: 'b' }),
            edition({ id: 'c' }),
        ];

        expect(await store.importEditions(editions)).toEqual({
            imported: ['a'],
            conflicts: ['b'],
            overLimit: ['c'],
            invalid: { d: ['language: must be "nl" or "en"'] },
        });
        expect(urlOf(fetch)).toBe('/api/editions/import');
        expect(sentBody(fetch)).toEqual({ editions });
    });

    it('copes with a report without invalid editions', async () => {
        const { store } = setup(
            json({ imported: [], conflicts: [], overLimit: [], invalid: [] }),
        );

        expect((await store.importEditions([edition()])).invalid).toEqual({});
    });
});

describe('putPhoto and the sync flow', () => {
    it('hands the photo to the upload hook, and does nothing without one', async () => {
        const record: PhotoRecord = {
            id: 'p1',
            editionId: 'e1',
            blob: new Blob(['x']),
            width: 10,
            height: 10,
            createdAt: 1,
        };
        const { store, uploadPhoto } = setup();
        await store.putPhoto(record);
        expect(uploadPhoto).toHaveBeenCalledWith(record);

        const bare = createRemoteEditionStore({
            client: createApiClient({
                fetch: () => Promise.reject(new Error()),
            }),
        });
        await expect(bare.putPhoto(record)).resolves.toBeUndefined();
    });

    it('works as the remote of uploadEditions: uploaded, conflicts and limit', async () => {
        const { store } = setup(
            json({ edition: edition({ id: 'a' }) }, 201),
            json({ code: 'conflict', current: edition({ id: 'b' }) }, 409),
            json({ code: 'edition_limit', limit: 20 }, 422),
        );
        const editions = new Map(
            ['a', 'b', 'c'].map((id) => [id, edition({ id })]),
        );
        const photos = vi.fn(() =>
            Promise.resolve<PhotoRecord[]>([
                {
                    id: photo().photoId,
                    editionId: 'a',
                    blob: new Blob(['x']),
                    width: 1,
                    height: 1,
                    createdAt: 1,
                },
            ]),
        );

        const report = await uploadEditions(['a', 'b', 'c'], {
            remote: store,
            getEdition: (id) => Promise.resolve(editions.get(id)),
            listPhotos: photos,
        });

        expect(report).toEqual({
            uploaded: ['a'],
            conflicts: ['b'],
            overLimit: ['c'],
        });
    });
});
