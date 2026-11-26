// @vitest-environment node
// Needs the dev dependency `fake-indexeddb`.
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { CorruptEditionError } from '../../lib/render/edition-storage';
import { describeStorageContract } from '../../testing/edition-storage-contract';
import { makeEdition } from '../../testing/edition-test-utils';
import { IndexedDbEditionStorage } from './indexeddb-storage';

describeStorageContract(
    'IndexedDB',
    () => new IndexedDbEditionStorage(new IDBFactory()),
);

describe('IndexedDbEditionStorage', () => {
    it('keeps data when reopened', async () => {
        const factory = new IDBFactory();
        const first = new IndexedDbEditionStorage(factory);
        await first.createEdition(makeEdition({ id: 'a' }));
        first.close();

        const second = new IndexedDbEditionStorage(factory);
        expect((await second.getEdition('a'))?.id).toBe('a');
    });

    it('skips editions that cannot be read when listing, but fails loudly on get', async () => {
        const factory = new IDBFactory();
        const storage = new IndexedDbEditionStorage(factory);
        await storage.createEdition(makeEdition({ id: 'good' }));
        await storage.createEdition({
            ...makeEdition({ id: 'bad' }),
            schemaVersion: 99,
        });

        expect(
            (await storage.listEditions()).map((edition) => edition.id),
        ).toEqual(['good']);
        await expect(storage.getEdition('bad')).rejects.toThrow('not valid');
        await expect(storage.getEdition('bad')).rejects.toBeInstanceOf(
            CorruptEditionError,
        );
        await expect(
            storage.applyPatch('bad', { baseRevision: 0, name: 'x' }, 1),
        ).rejects.toBeInstanceOf(CorruptEditionError);
    });

    it('opens, lists and saves an edition broken by a swap across colour groups (round 4, bug 1)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const factory = new IDBFactory();
        const storage = new IndexedDbEditionStorage(factory);
        // Exactly what the old swap stored: the light blue price on the brown street and the other way round.
        await storage.createEdition({
            ...makeEdition({ id: 'swapped' }),
            elements: {
                'space.01': {
                    name: 'Kaperspad',
                    amounts: { price: 120, 'rent.1': 12 },
                },
                'space.06': {
                    name: 'Ankerbaai',
                    amounts: { price: 70, mortgage: 30 },
                },
                'deed.01': { name: 'Kaperspad' },
            },
        });

        const opened = await storage.getEdition('swapped');

        expect(opened?.elements['space.01']).toEqual({
            name: 'Kaperspad',
            amounts: { price: 72, 'rent.1': 12 },
        });
        expect(opened?.elements['space.06']).toEqual({
            name: 'Ankerbaai',
            amounts: { price: 80, mortgage: 40 },
        });
        expect(opened?.elements['deed.01']).toEqual({ name: 'Kaperspad' });
        expect(
            (await storage.listEditions()).map((edition) => edition.id),
        ).toEqual(['swapped']);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('repaired on read'),
        );

        const saved = await storage.applyPatch(
            'swapped',
            { baseRevision: 0, name: 'Zeven Zeeën' },
            5,
        );
        expect(saved.ok).toBe(true);
        warn.mockClear();
        expect((await storage.getEdition('swapped'))?.name).toBe('Zeven Zeeën');
        // The repair was written back with the save.
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it('lets only one of two writers with the same revision win', async () => {
        const factory = new IDBFactory();
        const a = new IndexedDbEditionStorage(factory);
        const b = new IndexedDbEditionStorage(factory);
        await a.createEdition(makeEdition({ id: 'x' }));
        const [ra, rb] = await Promise.all([
            a.applyPatch('x', { baseRevision: 0, name: 'A' }, 1),
            b.applyPatch('x', { baseRevision: 0, name: 'B' }, 2),
        ]);
        expect([ra.ok, rb.ok].filter(Boolean)).toHaveLength(1);
        expect((await a.getEdition('x'))?.revision).toBe(1);
    });
});

describe('IndexedDbEditionStorage, moving the bank name (B148)', () => {
    /** A database as version 1 left it, with an edition that keeps the bank name under `bank`. */
    async function versionOne(factory: IDBFactory): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const req = factory.open('printopoly', 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                db.createObjectStore('editions', { keyPath: 'id' }).put({
                    ...makeEdition({ id: 'old' }),
                    elements: {
                        bank: { name: 'Bank van de club' },
                        'space.01': { name: 'Dorpsstraat' },
                    },
                });
                db.createObjectStore('photos', { keyPath: 'id' }).createIndex(
                    'editionId',
                    'editionId',
                );
            };
            req.onsuccess = () => {
                req.result.close();
                resolve();
            };
            req.onerror = () => reject(req.error ?? new Error('open'));
        });
    }

    async function rawRow(factory: IDBFactory, id: string): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const req = factory.open('printopoly');
            req.onsuccess = () => {
                const get = req.result
                    .transaction('editions')
                    .objectStore('editions')
                    .get(id);
                get.onsuccess = () => {
                    req.result.close();
                    resolve(get.result);
                };
                get.onerror = () => reject(get.error ?? new Error('get'));
            };
            req.onerror = () => reject(req.error ?? new Error('open'));
        });
    }

    it('rewrites stored editions once when the database is upgraded', async () => {
        const factory = new IDBFactory();
        await versionOne(factory);

        const storage = new IndexedDbEditionStorage(factory);
        const edition = await storage.getEdition('old');
        storage.close();

        expect(edition?.elements['words.bank']).toEqual({
            name: 'Bank van de club',
        });
        expect(edition?.elements['bank']).toBeUndefined();
        expect(edition?.revision).toBe(0);

        const row = (await rawRow(factory, 'old')) as {
            elements: Record<string, unknown>;
        };
        expect(Object.keys(row.elements).sort()).toEqual([
            'space.01',
            'words.bank',
        ]);
    });

    it('adds the store for print jobs to an old database and keeps its editions', async () => {
        const factory = new IDBFactory();
        await versionOne(factory);

        const storage = new IndexedDbEditionStorage(factory);
        await storage.addPrintJob({
            token: 't'.repeat(40),
            editionId: 'old',
            revision: 0,
            createdAt: 1,
        });

        expect((await storage.listPrintJobs()).map((job) => job.token)).toEqual(
            ['t'.repeat(40)],
        );
        expect((await storage.getEdition('old'))?.id).toBe('old');
        storage.close();
    });
});
