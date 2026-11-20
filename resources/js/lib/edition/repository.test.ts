import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { setElement } from './changes';
import { DAY_MS, EditionRepository, usedPhotoIds } from './repository';
import { MemoryEditionStorage } from './storage';
import { changeOf, clock, counter, createFakeNetwork, makeBus, makeEdition, photo } from './test-utils';

function setup() {
    const storage = new MemoryEditionStorage();
    const time = clock(1_000);
    const repository = new EditionRepository({
        storage,
        bus: makeBus(createFakeNetwork(), 'w1'),
        now: time.now,
        newId: counter('id'),
    });

    return { storage, time, repository };
}

const input = { name: 'Zaterdagclub', language: 'nl', theme: 'classic', boardProfile: DEFAULT_BOARD_PROFILE } as const;

describe('create', () => {
    it('stores a new edition from the new-edition fields (B72)', async () => {
        const { repository, storage } = setup();
        const edition = await repository.create({ ...input, parts: { money: true } });
        expect(edition).toMatchObject({
            id: 'id-1',
            currency: 'eur',
            revision: 0,
            parts: { deeds: true, money: true, pawns: false },
        });
        expect(await storage.getEdition('id-1')).toEqual(edition);
    });

    it('refuses an empty name and a board profile that does not work', async () => {
        const { repository } = setup();
        await expect(repository.create({ ...input, name: '   ' })).rejects.toThrow('needs a name');
        await expect(
            repository.create({ ...input, boardProfile: { ...DEFAULT_BOARD_PROFILE, corner: 300 } }),
        ).rejects.toThrow(RangeError);
    });
});

describe('list', () => {
    it('shows the newest first with counts for "Mijn edities"', async () => {
        const { repository, time } = setup();
        await repository.create({ ...input, name: 'Oud' });
        time.tick(1000);
        const newer = await repository.create({ ...input, name: 'Nieuw' });
        const session = await repository.open(newer.id);
        session?.apply([changeOf(newer, 'space.01', { name: 'A' }), changeOf(newer, 'card.chance.01', { text: 'x' })]);
        time.tick(1000);
        await session?.flush();

        const list = await repository.list();
        expect(list.map((entry) => entry.name)).toEqual(['Nieuw', 'Oud']);
        expect(list[0]).toMatchObject({
            customizedSpaces: 1,
            customizedElements: 2,
            revision: 1,
            theme: 'classic',
            language: 'nl',
        });
        expect(list[1]).toMatchObject({ customizedSpaces: 0, customizedElements: 0 });
    });
});

describe('rename', () => {
    it('renames and bumps the revision', async () => {
        const { repository } = setup();
        const edition = await repository.create(input);
        const renamed = await repository.rename(edition.id, '  Kerst bij oma ');
        expect(renamed).toMatchObject({ name: 'Kerst bij oma', revision: 1 });
        expect((await repository.get(edition.id))?.name).toBe('Kerst bij oma');
    });

    it('refuses empty names and unknown editions', async () => {
        const { repository } = setup();
        const edition = await repository.create(input);
        await expect(repository.rename(edition.id, ' ')).rejects.toThrow();
        await expect(repository.rename('missing', 'x')).rejects.toThrow('does not exist');
    });

    it('is seen by an open session of another window as a remote save', async () => {
        const { repository } = setup();
        const edition = await repository.create(input);
        await repository.rename(edition.id, 'Anders');
        expect((await repository.open(edition.id))?.edition.name).toBe('Anders');
    });
});

describe('duplicate', () => {
    it('copies elements and photos with new ids, leaving the original alone (B96)', async () => {
        const { repository, storage } = setup();
        const original = await repository.create(input);
        const photoId = await repository.addPhoto(original.id, {
            blob: new Blob(['abc']),
            width: 100,
            height: 50,
            fileName: 'a.jpg',
        });
        const session = await repository.open(original.id);
        session?.apply([changeOf(original, 'space.01', { name: 'Park', photo: photo(photoId) })]);
        await session?.flush();

        const copy = await repository.duplicate(original.id);
        expect(copy.id).not.toBe(original.id);
        expect(copy).toMatchObject({ name: 'Zaterdagclub (kopie)', revision: 0 });
        const copiedPhotoId = copy.elements['space.01']?.photo?.photoId;
        expect(copiedPhotoId).toBeDefined();
        expect(copiedPhotoId).not.toBe(photoId);
        expect(copy.elements['space.01']?.photo).toMatchObject({ cx: 0.5, scale: 1 });

        expect((await storage.listPhotos(copy.id)).map((p) => p.id)).toEqual([copiedPhotoId]);
        expect((await storage.listPhotos(original.id)).map((p) => p.id)).toEqual([photoId]);
        expect((await repository.get(original.id))?.elements['space.01']?.photo?.photoId).toBe(photoId);
    });

    it('takes a given name, and English copies say "copy"', async () => {
        const { repository } = setup();
        const nl = await repository.create(input);
        const en = await repository.create({ ...input, name: 'Club', language: 'en' });
        expect((await repository.duplicate(nl.id, '  Tweede ')).name).toBe('Tweede');
        expect((await repository.duplicate(en.id)).name).toBe('Club (copy)');
        await expect(repository.duplicate('missing')).rejects.toThrow();
    });

    it('copies photos in free layers too', async () => {
        const { repository, storage } = setup();
        const original = await repository.create({ ...input, parts: { boxLid: true } });
        const photoId = await repository.addPhoto(original.id, { blob: new Blob(['x']), width: 1, height: 1 });
        const session = await repository.open(original.id);
        session?.apply([
            changeOf(original, 'box_lid', {
                layers: [{ id: 'l', kind: 'photo', photo: photo(photoId), x: 0, y: 0, w: 5, h: 5 }],
            }),
        ]);
        await session?.flush();
        const copy = await repository.duplicate(original.id);
        const layer = copy.elements['box_lid']?.layers?.[0];
        expect(layer?.kind === 'photo' && layer.photo.photoId).not.toBe(photoId);
        expect(await storage.listPhotos(copy.id)).toHaveLength(1);
    });
});

describe('delete', () => {
    it('removes the edition and its photos (B79)', async () => {
        const { repository, storage } = setup();
        const edition = await repository.create(input);
        const photoId = await repository.addPhoto(edition.id, { blob: new Blob(['x']), width: 1, height: 1 });
        await repository.delete(edition.id);
        expect(await repository.get(edition.id)).toBeUndefined();
        expect(await storage.getPhoto(photoId)).toBeUndefined();
        expect(await repository.list()).toEqual([]);
        expect(await repository.open(edition.id)).toBeUndefined();
    });
});

describe('photos', () => {
    it('stores blobs by id', async () => {
        const { repository } = setup();
        const edition = await repository.create(input);
        const id = await repository.addPhoto(edition.id, {
            blob: new Blob(['abc']),
            width: 3,
            height: 4,
            fileName: 'x.png',
        });
        expect(await repository.getPhoto(id)).toMatchObject({
            editionId: edition.id,
            width: 3,
            height: 4,
            fileName: 'x.png',
        });
        expect((await repository.getPhoto(id))?.blob.size).toBe(3);
    });

    it('finds the photos an edition uses', () => {
        const edition = setElement(setElement(makeEdition(), 'space.01', { photo: photo('a') }).edition, 'deed.01', {
            photo: photo('b'),
        }).edition;
        expect([...usedPhotoIds(edition.elements)].sort()).toEqual(['a', 'b']);
    });

    it('prunes unused photos only when they are old enough', async () => {
        const { repository, storage, time } = setup();
        const edition = await repository.create(input);
        const used = await repository.addPhoto(edition.id, { blob: new Blob(['u']), width: 1, height: 1 });
        const unused = await repository.addPhoto(edition.id, { blob: new Blob(['o']), width: 1, height: 1 });
        const session = await repository.open(edition.id);
        session?.apply([changeOf(edition, 'space.01', { photo: photo(used) })]);
        await session?.flush();

        expect(await repository.pruneUnusedPhotos(edition.id)).toEqual([]);
        time.tick(DAY_MS + 1);
        expect(await repository.pruneUnusedPhotos(edition.id)).toEqual([unused]);
        expect((await storage.listPhotos(edition.id)).map((p) => p.id)).toEqual([used]);
        expect(await repository.pruneUnusedPhotos('missing')).toEqual([]);
    });

    it('prunes when an edition is opened', async () => {
        const { repository, storage, time } = setup();
        const edition = await repository.create(input);
        await repository.addPhoto(edition.id, { blob: new Blob(['o']), width: 1, height: 1 });
        time.tick(2 * DAY_MS);
        await repository.open(edition.id);
        expect(await storage.listPhotos(edition.id)).toEqual([]);
    });
});
