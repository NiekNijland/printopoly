import { describe, expect, it } from 'vitest';
import type { EditionStorage } from '../lib/render/edition-storage';
import type { PhotoRecord } from '../lib/render/edition-types';
import { makeEdition } from './edition-test-utils';

const photoRecord = (id: string, editionId: string): PhotoRecord => {
    return {
        id,
        editionId,
        blob: new Blob(['x'], { type: 'image/jpeg' }),
        width: 10,
        height: 20,
        createdAt: 1,
    };
};

/** The behaviour every `EditionStorage` must have; run against the memory and the IndexedDB implementation. */
export const describeStorageContract = (
    name: string,
    create: () => EditionStorage,
): void => {
    describe(`${name} storage contract`, () => {
        it('creates, gets and lists editions', async () => {
            const storage = create();
            await storage.createEdition(makeEdition({ id: 'a' }));
            await storage.createEdition(
                makeEdition({ id: 'b', name: 'Tweede' }),
            );
            expect((await storage.getEdition('a'))?.name).toBe('Zaterdagclub');
            expect(await storage.getEdition('zzz')).toBeUndefined();
            expect(
                (await storage.listEditions())
                    .map((edition) => edition.id)
                    .sort(),
            ).toEqual(['a', 'b']);
        });

        it('refuses a second edition with the same id', async () => {
            const storage = create();
            await storage.createEdition(makeEdition({ id: 'a' }));
            await expect(
                storage.createEdition(makeEdition({ id: 'a' })),
            ).rejects.toThrow();
        });

        it('applies a patch against the right revision and bumps it', async () => {
            const storage = create();
            await storage.createEdition(makeEdition({ id: 'a' }));
            const result = await storage.applyPatch(
                'a',
                {
                    baseRevision: 0,
                    name: 'Nieuw',
                    elements: { 'space.01': { name: 'Park' } },
                },
                50,
            );
            expect(result.ok).toBe(true);
            const stored = await storage.getEdition('a');
            expect(stored).toMatchObject({
                name: 'Nieuw',
                revision: 1,
                updatedAt: 50,
                elements: { 'space.01': { name: 'Park' } },
            });
        });

        it('never overwrites on a revision mismatch', async () => {
            const storage = create();
            await storage.createEdition(makeEdition({ id: 'a' }));
            await storage.applyPatch(
                'a',
                { baseRevision: 0, name: 'Eerste' },
                50,
            );
            const result = await storage.applyPatch(
                'a',
                { baseRevision: 0, name: 'Tweede' },
                60,
            );
            expect(result.ok).toBe(false);
            if (!result.ok && result.reason === 'conflict') {
                expect(result.current.name).toBe('Eerste');
                expect(result.current.revision).toBe(1);
            } else {
                throw new Error('expected a conflict');
            }
            expect((await storage.getEdition('a'))?.name).toBe('Eerste');
        });

        it('says when the edition is gone', async () => {
            const storage = create();
            expect(
                await storage.applyPatch('nope', { baseRevision: 0 }, 1),
            ).toEqual({ ok: false, reason: 'missing' });
        });

        it('keeps photos as blobs per edition and deletes them with it', async () => {
            const storage = create();
            await storage.createEdition(makeEdition({ id: 'a' }));
            await storage.createEdition(makeEdition({ id: 'b' }));
            await storage.putPhoto(photoRecord('p1', 'a'));
            await storage.putPhoto(photoRecord('p2', 'a'));
            await storage.putPhoto(photoRecord('p3', 'b'));

            const loaded = await storage.getPhoto('p1');
            expect(loaded?.blob.size).toBe(1);
            expect(loaded?.width).toBe(10);
            expect(
                (await storage.listPhotos('a')).map((photo) => photo.id).sort(),
            ).toEqual(['p1', 'p2']);

            await storage.deletePhotos(['p2']);
            expect(
                (await storage.listPhotos('a')).map((photo) => photo.id),
            ).toEqual(['p1']);

            await storage.deleteEdition('a');
            expect(await storage.getEdition('a')).toBeUndefined();
            expect(await storage.getPhoto('p1')).toBeUndefined();
            expect(
                (await storage.listPhotos('b')).map((photo) => photo.id),
            ).toEqual(['p3']);
        });

        it('keeps the newest print jobs per edition and deletes them with it', async () => {
            const storage = create();
            await storage.createEdition(makeEdition({ id: 'a' }));
            await storage.createEdition(makeEdition({ id: 'b' }));
            for (let index = 0; index < 7; index++) {
                await storage.addPrintJob({
                    token: `a${String(index)}`,
                    editionId: 'a',
                    revision: index,
                    createdAt: 100 + index,
                });
            }
            await storage.addPrintJob({
                token: 'b0',
                editionId: 'b',
                revision: 1,
                createdAt: 1,
            });

            expect(
                (await storage.listPrintJobs()).map((job) => job.token).sort(),
            ).toEqual(['a2', 'a3', 'a4', 'a5', 'a6', 'b0']);

            await storage.deleteEdition('a');
            expect(await storage.listPrintJobs()).toEqual([
                { token: 'b0', editionId: 'b', revision: 1, createdAt: 1 },
            ]);
        });
    });
};
