// @vitest-environment node
// Needs the dev dependency `fake-indexeddb`.
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { IndexedDbEditionStorage } from './indexeddb-storage';
import { CorruptEditionError } from './storage';
import { describeStorageContract } from './storage-contract';
import { makeEdition } from './test-utils';

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

    it('skips editions that no longer pass the schema when listing, but fails loudly on get', async () => {
        const factory = new IDBFactory();
        const storage = new IndexedDbEditionStorage(factory);
        await storage.createEdition(makeEdition({ id: 'good' }));
        await storage.createEdition({
            ...makeEdition({ id: 'bad' }),
            theme: 'neon' as never,
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
