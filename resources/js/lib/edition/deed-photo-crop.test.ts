import { describe, expect, it } from 'vitest';

import { deedCrop } from './deed-photos';
import type { PhotoPlacement } from './types';

const PHOTO: PhotoPlacement = {
    photoId: 'photo-ref-0001',
    cx: 0.5,
    cy: 0.5,
    scale: 1,
    rotation: 0,
    grayscale: false,
};

/**
 * The same numbers as tests/Unit/Print/DeedCropTest.php (B239): the server crops a borrowed deed photo of a stored
 * edition as the browser does, so the print matches the editor.
 */
describe('the crop of a borrowed photo on a title deed, browser and server alike (B239)', () => {
    it('shows the upper part of an untouched landscape photo', () => {
        const crop = deedCrop(PHOTO, { width: 800, height: 600 }, undefined);

        expect(crop.cy).toBeCloseTo(0.401235, 6);
        expect(crop.cx).toBe(0.5);
        expect(crop.fit).toBeUndefined();
    });

    it('fills the strip with a standing photo, the face line a third down (B253)', () => {
        const crop = deedCrop(PHOTO, { width: 600, height: 800 }, undefined);

        expect(crop.cy).toBeCloseTo(0.371528, 6);
        expect(crop.scale).toBe(1);
        expect(crop.fit).toBeUndefined();
    });

    it('crops a photo over the full width of the deed on its own wider strip (B253)', () => {
        const crop = deedCrop(PHOTO, { width: 600, height: 800 }, 'full');

        expect(crop.cy).toBeCloseTo(0.365942, 6);
        expect(crop.fit).toBeUndefined();
    });

    it('keeps a moved photo, a fitted photo and a photo of unknown size as they are', () => {
        const moved = { ...PHOTO, cy: 0.2 };

        expect(deedCrop(moved, { width: 800, height: 600 }, undefined)).toEqual(
            moved,
        );
        expect(
            deedCrop(
                { ...PHOTO, fit: true },
                { width: 600, height: 800 },
                undefined,
            ),
        ).toEqual({ ...PHOTO, fit: true });
        expect(
            deedCrop({ ...PHOTO, borrowed: true }, undefined, undefined),
        ).toEqual(PHOTO);
    });
});
