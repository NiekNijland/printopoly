import { describe, expect, it } from 'vitest';
import { MemoryEditionStorage } from '../../lib/render/edition-storage';
import type { Edition, EditionSummary } from '../../lib/render/edition-types';
import { makeEdition } from '../../testing/edition-test-utils';
import {
    buildSyncQuestion,
    findLocalOnly,
    findRemoteOnly,
    uploadEditions,
    type RemoteEditionStore,
    type RemoteEditionSummary,
} from './sync';

function summary(id: string, name = id): EditionSummary {
    return {
        id,
        name,
        language: 'nl',
        theme: 'classic',
        revision: 0,
        updatedAt: 1,
        createdAt: 1,
        customizedSpaces: 0,
        customizedElements: 0,
        customizedPercent: 0,
    };
}

const remote = (id: string): RemoteEditionSummary => ({
    id,
    name: id,
    revision: 1,
    updatedAt: 1,
});

describe('findLocalOnly and findRemoteOnly', () => {
    it('compares by id', () => {
        const local = [summary('a'), summary('b'), summary('c')];
        const server = [remote('b'), remote('z')];
        expect(findLocalOnly(local, server).map((e) => e.id)).toEqual([
            'a',
            'c',
        ]);
        expect(findRemoteOnly(local, server).map((e) => e.id)).toEqual(['z']);
    });
});

describe('buildSyncQuestion', () => {
    it('asks one question with the wording of the design (B81)', () => {
        const question = buildSyncQuestion(
            [summary('a'), summary('b'), summary('c')],
            [],
            {
                locale: 'nl',
                userName: 'Niek',
            },
        );
        expect(question).toMatchObject({
            count: 3,
            title: 'Welkom, Niek. Je hebt 3 edities in deze browser.',
            body: 'Wil je ze in je account bewaren? Dan zie je ze op elk apparaat waar je inlogt, ook als je deze browser leegmaakt.',
            accept: 'Bewaren in mijn account',
            decline: 'Nu niet',
            overLimit: null,
        });
    });

    it('counts only editions the account does not have', () => {
        const question = buildSyncQuestion(
            [summary('a'), summary('b')],
            [remote('a')],
            { locale: 'nl' },
        );
        expect(question?.count).toBe(1);
        expect(question?.title).toBe('Je hebt 1 editie in deze browser.');
        expect(question?.body).toContain('Wil je hem in je account bewaren?');
        expect(question?.editions.map((e) => e.id)).toEqual(['b']);
    });

    it('asks nothing when everything is already in the account', () => {
        expect(
            buildSyncQuestion([summary('a')], [remote('a')], { locale: 'nl' }),
        ).toBeNull();
        expect(buildSyncQuestion([], [], { locale: 'nl' })).toBeNull();
    });

    it('has English wording', () => {
        const question = buildSyncQuestion([summary('a'), summary('b')], [], {
            locale: 'en',
            userName: 'Sam',
        });
        expect(question?.title).toBe(
            'Welcome, Sam. You have 2 editions in this browser.',
        );
        expect(question?.accept).toBe('Keep in my account');
    });

    it('warns when not everything fits in the account (B70)', () => {
        const local = [summary('a'), summary('b'), summary('c')];
        const server = Array.from({ length: 18 }, (_, i) => remote(`r${i}`));
        const question = buildSyncQuestion(local, server, { locale: 'nl' });
        expect(question?.overLimit).toEqual({
            limit: 20,
            room: 2,
            message: 'In een account passen 20 edities. Kies welke je bewaart.',
        });
        expect(
            buildSyncQuestion(local, [], { locale: 'nl', limit: 2 })?.overLimit
                ?.room,
        ).toBe(2);
    });
});

class FakeRemote implements RemoteEditionStore {
    readonly editions = new Map<string, Edition>();
    readonly photos: string[] = [];
    limit = 20;

    list() {
        return Promise.resolve(
            [...this.editions.values()].map((e) => remote(e.id)),
        );
    }
    get(id: string) {
        return Promise.resolve(this.editions.get(id));
    }
    put(edition: Edition, expectedRevision: number | null) {
        const existing = this.editions.get(edition.id);
        if (existing !== undefined && expectedRevision === null) {
            return Promise.resolve({
                ok: false as const,
                reason: 'conflict' as const,
                current: remote(edition.id),
            });
        }
        if (existing === undefined && this.editions.size >= this.limit) {
            return Promise.resolve({
                ok: false as const,
                reason: 'limit' as const,
            });
        }
        this.editions.set(edition.id, edition);

        return Promise.resolve({
            ok: true as const,
            revision: edition.revision,
        });
    }
    putPhoto(photo: { id: string }) {
        this.photos.push(photo.id);

        return Promise.resolve();
    }
    delete(id: string) {
        this.editions.delete(id);

        return Promise.resolve();
    }
}

describe('uploadEditions', () => {
    it('sends editions and their photos, and never overwrites a remote edition', async () => {
        const storage = new MemoryEditionStorage();
        await storage.createEdition(makeEdition({ id: 'a' }));
        await storage.createEdition(makeEdition({ id: 'b' }));
        await storage.createEdition(makeEdition({ id: 'c' }));
        await storage.putPhoto({
            id: 'p1',
            editionId: 'a',
            blob: new Blob(['x']),
            width: 1,
            height: 1,
            createdAt: 1,
        });
        const server = new FakeRemote();
        server.editions.set(
            'b',
            makeEdition({ id: 'b', name: 'op de server' }),
        );

        const report = await uploadEditions(['a', 'b', 'gone'], {
            remote: server,
            getEdition: (id) => storage.getEdition(id),
            listPhotos: (id) => storage.listPhotos(id),
        });

        expect(report).toEqual({
            uploaded: ['a'],
            conflicts: ['b'],
            overLimit: [],
        });
        expect(server.photos).toEqual(['p1']);
        expect(server.editions.get('b')?.name).toBe('op de server');
    });

    it('reports editions that do not fit', async () => {
        const storage = new MemoryEditionStorage();
        await storage.createEdition(makeEdition({ id: 'a' }));
        const server = new FakeRemote();
        server.limit = 0;
        const report = await uploadEditions(['a'], {
            remote: server,
            getEdition: (id) => storage.getEdition(id),
            listPhotos: (id) => storage.listPhotos(id),
        });
        expect(report).toEqual({
            uploaded: [],
            conflicts: [],
            overLimit: ['a'],
        });
    });
});
