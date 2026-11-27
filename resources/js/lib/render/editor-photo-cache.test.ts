import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { photo } from '@/testing/edition-test-utils';

import type { PhotoRecord } from './edition-types';
import {
    PhotoCache,
    iconSource,
    photoSource,
    placementToTransform,
    type PhotoInfo,
} from './editor-photo-cache';

const record = (id: string, withPreview = true): PhotoRecord => ({
    id,
    editionId: 'e1',
    blob: new Blob(['original'], { type: 'image/jpeg' }),
    ...(withPreview
        ? { preview: new Blob(['preview'], { type: 'image/webp' }) }
        : {}),
    width: 4000,
    height: 3000,
    createdAt: 1,
});

const settle = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

describe('PhotoCache', () => {
    let created: Blob[];

    beforeEach(() => {
        created = [];
        vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
            if (blob instanceof Blob) {
                created.push(blob);
            }

            return `blob:${String(created.length)}`;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('loads each requested photo once and tells its listeners', async () => {
        const load = vi.fn<(id: string) => Promise<PhotoRecord | undefined>>(
            (id) => Promise.resolve(record(id)),
        );
        const cache = new PhotoCache(load);
        const listener = vi.fn<() => void>();
        cache.subscribe(listener);

        cache.request(['a', 'a']);
        cache.request(['a']);
        await settle();

        expect(load).toHaveBeenCalledExactlyOnceWith('a');
        expect(listener).toHaveBeenCalledOnce();
        expect(cache.getSnapshot().get('a')).toEqual({
            id: 'a',
            url: 'blob:1',
            width: 4000,
            height: 3000,
        });
        expect(created[0]?.type).toBe('image/webp');
    });

    it('shows the original when there is no preview, and skips a missing photo', async () => {
        const cache = new PhotoCache((id) =>
            Promise.resolve(id === 'gone' ? undefined : record(id, false)),
        );

        cache.request(['a', 'gone']);
        await settle();

        expect(created[0]?.type).toBe('image/jpeg');
        expect([...cache.getSnapshot().keys()]).toEqual(['a']);
    });

    it('tries a photo again after it failed to load', async () => {
        const load = vi
            .fn<(id: string) => Promise<PhotoRecord | undefined>>()
            .mockRejectedValueOnce(new Error('broken'))
            .mockResolvedValueOnce(record('a'));
        const cache = new PhotoCache(load);

        cache.request(['a']);
        await settle();
        expect(cache.getSnapshot().has('a')).toBe(false);

        cache.request(['a']);
        await settle();
        expect(load).toHaveBeenCalledTimes(2);
        expect(cache.getSnapshot().has('a')).toBe(true);
    });

    it('replaces a photo that is added again and frees the old URL', () => {
        const revoke = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
        const cache = new PhotoCache(() => Promise.resolve(undefined));
        const before = cache.getSnapshot();

        cache.add(record('a'));
        cache.add(record('a'));

        expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:1');
        expect(cache.getSnapshot().get('a')?.url).toBe('blob:2');
        expect(cache.getSnapshot()).not.toBe(before);
    });

    it('stops telling a listener after it unsubscribes', () => {
        const cache = new PhotoCache(() => Promise.resolve(undefined));
        const listener = vi.fn<() => void>();
        const unsubscribe = cache.subscribe(listener);

        unsubscribe();
        cache.add(record('a'));

        expect(listener).not.toHaveBeenCalled();
    });

    it('frees every URL on dispose and ignores loads that finish after it', async () => {
        const revoke = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
        let finish: (value: PhotoRecord) => void = () => undefined;
        const cache = new PhotoCache(
            () =>
                new Promise<PhotoRecord>((resolve) => {
                    finish = resolve;
                }),
        );
        cache.add(record('a'));
        cache.request(['late']);

        cache.dispose();
        finish(record('late'));
        await settle();

        expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:1');
        expect(cache.getSnapshot().size).toBe(0);
    });
});

const infos = new Map<string, PhotoInfo>([
    ['p1', { id: 'p1', url: 'blob:p1', width: 4000, height: 3000 }],
]);

describe('placementToTransform', () => {
    it('turns a placement into a transform with a normalised rotation', () => {
        expect(
            placementToTransform({ ...photo('p1'), rotation: -90, fit: true }),
        ).toEqual({
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 270,
            grayscale: false,
            fit: true,
        });
        expect(placementToTransform(photo('p1'))).not.toHaveProperty('fit');
    });
});

describe('photoSource', () => {
    it('is undefined without a placement or while the photo loads', () => {
        expect(photoSource(undefined, infos)).toBeUndefined();
        expect(photoSource(photo('p9'), infos)).toBeUndefined();
    });

    it('gives the URL, size and transform of a loaded photo', () => {
        expect(photoSource({ ...photo('p1'), cx: 0.3 }, infos)).toEqual({
            src: 'blob:p1',
            width: 4000,
            height: 3000,
            transform: {
                x: 0.3,
                y: 0.5,
                scale: 1,
                rotation: 0,
                grayscale: false,
            },
        });
    });

    it('marks the full style and crops a borrowed photo for the deed', () => {
        const source = photoSource(
            { ...photo('p1'), borrowed: true },
            infos,
            'full',
        );

        expect(source?.style).toBe('full');
        expect(source?.transform?.y).toBeCloseTo(
            1 / 3 + ((18 / 69) * (4 / 3)) / 6,
            6,
        );
    });
});

describe('iconSource', () => {
    it('passes a preset and leaves out a missing icon', () => {
        expect(iconSource(undefined, infos)).toBeUndefined();
        expect(iconSource({ preset: 'train' }, infos)).toEqual({
            preset: 'train',
        });
    });

    it('draws an uploaded icon only once its photo is loaded', () => {
        expect(
            iconSource({ photo: photo('p1'), aspect: 1.5 }, infos),
        ).toMatchObject({ photo: { src: 'blob:p1' }, aspect: 1.5 });
        expect(
            iconSource({ photo: photo('p9'), aspect: 1 }, infos),
        ).toBeUndefined();
    });
});
