import { describe, expect, it } from 'vitest';

import { makeEdition, photo } from '@/testing/edition-test-utils';

import { deedCrop, deedPhotoOf, withDeedPhotos } from './edition-deed-photos';
import type { Edition, PhotoPlacement } from './edition-types';

const placement = (
    overrides: Partial<PhotoPlacement> = {},
): PhotoPlacement => ({
    ...photo('p1'),
    ...overrides,
});

describe('deedCrop', () => {
    it('drops the borrowed flag and keeps the crop without a size', () => {
        expect(
            deedCrop(
                placement({ borrowed: true, cy: 0.2 }),
                undefined,
                undefined,
            ),
        ).toEqual(placement({ cy: 0.2 }));
    });

    it('keeps a photo that fits, and one with an empty size', () => {
        const fit = placement({ fit: true });

        expect(deedCrop(fit, { width: 400, height: 300 }, undefined)).toEqual(
            fit,
        );
        expect(
            deedCrop(placement(), { width: 0, height: 300 }, undefined),
        ).toEqual(placement());
    });

    it('moves an untouched landscape photo to the face line of the strip', () => {
        const result = deedCrop(
            placement(),
            { width: 4000, height: 3000 },
            undefined,
        );

        expect(result.cx).toBe(0.5);
        expect(result.cy).toBeCloseTo(1 / 3 + ((16.5 / 54) * (4 / 3)) / 6, 6);
    });

    it('uses the full-width strip for a full photo style', () => {
        const result = deedCrop(
            placement(),
            { width: 4000, height: 3000 },
            'full',
        );

        expect(result.cy).toBeCloseTo(1 / 3 + ((18 / 69) * (4 / 3)) / 6, 6);
    });

    it('treats a photo turned a quarter as standing and crops it even off-centre', () => {
        const result = deedCrop(
            placement({ rotation: 90, cy: 0.3, cx: 0.2 }),
            { width: 4000, height: 3000 },
            undefined,
        );

        expect(result.cx).toBe(0.5);
        expect(result.cy).toBeCloseTo(1 / 3 + ((16.5 / 54) * (3 / 4)) / 6, 6);
    });

    it('leaves a moved or zoomed landscape photo alone', () => {
        const moved = placement({ cy: 0.3 });
        const zoomed = placement({ scale: 1.5 });

        expect(deedCrop(moved, { width: 400, height: 300 }, undefined)).toEqual(
            moved,
        );
        expect(
            deedCrop(zoomed, { width: 400, height: 300 }, undefined),
        ).toEqual(zoomed);
    });
});

describe('deedPhotoOf', () => {
    it('prefers the own photo of the deed', () => {
        const edition = makeEdition();
        const elements = {
            'deed.01': { photo: photo('own'), photoStyle: 'full' as const },
            'space.01': { photo: photo('street') },
        };

        expect(deedPhotoOf({ ...edition, elements }, 1)).toEqual({
            photo: photo('own'),
            photoStyle: 'full',
            from: 'deed',
        });
    });

    it('borrows the photo of the space with the style of the deed or else the space', () => {
        const elements = {
            'space.01': { photo: photo('street'), photoStyle: 'full' as const },
            'deed.02': { photoStyle: 'framed' as const },
            'space.03': { photo: photo('field') },
        };

        expect(deedPhotoOf({ elements }, 1)).toEqual({
            photo: { ...photo('street'), borrowed: true },
            photoStyle: 'full',
            from: 'space',
        });
        expect(deedPhotoOf({ elements }, 2)?.photoStyle).toBe('framed');
    });

    it('shows nothing when the space has no photo or keeps it off the deed', () => {
        const elements = {
            'space.01': { photo: photo('street'), deedPhoto: false },
        };

        expect(deedPhotoOf({ elements }, 1)).toBeUndefined();
        expect(deedPhotoOf({ elements }, 2)).toBeUndefined();
        expect(deedPhotoOf({ elements }, 99)).toBeUndefined();
    });
});

describe('withDeedPhotos', () => {
    it('returns the same edition when no deed borrows a photo', () => {
        const edition = makeEdition();

        expect(withDeedPhotos(edition)).toBe(edition);
    });

    it('writes the photo of each space onto its deed, cropped for the deed frame', () => {
        const edition: Pick<Edition, 'elements'> = {
            elements: {
                'space.01': {
                    photo: photo('street'),
                    photoStyle: 'full',
                },
                'deed.02': { photo: photo('own') },
                'space.03': { photo: photo('field') },
            },
        };
        const sizes = new Map([['street', { width: 4000, height: 3000 }]]);
        const result = withDeedPhotos(edition, sizes);

        expect(result.elements['deed.01']?.photoStyle).toBe('full');
        expect(result.elements['deed.01']?.photo?.photoId).toBe('street');
        expect(result.elements['deed.01']?.photo?.borrowed).toBeUndefined();
        expect(result.elements['deed.01']?.photo?.cy).toBeCloseTo(
            1 / 3 + ((18 / 69) * (4 / 3)) / 6,
            6,
        );
        expect(result.elements['deed.02']?.photo).toEqual(photo('own'));
        expect(result.elements['deed.02']).toEqual({ photo: photo('own') });
        expect(edition.elements).not.toHaveProperty('deed.01');
    });
});
