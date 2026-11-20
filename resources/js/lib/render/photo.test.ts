import { describe, expect, it } from 'vitest';

import { clampScale, DEFAULT_PHOTO_TRANSFORM, photoLayout } from './photo';

describe('photoLayout', () => {
    it('covers the slot without a transform', () => {
        const layout = photoLayout(DEFAULT_PHOTO_TRANSFORM, 40, 20);

        expect(layout.box).toEqual({ left: 0, top: 0, width: 40, height: 20 });
        expect(layout.transform).toBe('translate(0mm, 0mm) scale(1) rotate(0deg)');
        expect(layout.filter).toBeUndefined();
    });

    it('swaps the image box for quarter turns so the turned photo still covers the slot', () => {
        const layout = photoLayout({ ...DEFAULT_PHOTO_TRANSFORM, rotation: 90 }, 40, 20);

        expect(layout.box).toEqual({ left: 10, top: -10, width: 20, height: 40 });
        expect(layout.transform).toContain('rotate(90deg)');
        expect(photoLayout({ ...DEFAULT_PHOTO_TRANSFORM, rotation: 180 }, 40, 20).box.width).toBe(40);
        expect(photoLayout({ ...DEFAULT_PHOTO_TRANSFORM, rotation: 270 }, 40, 20).box.width).toBe(20);
    });

    it('moves by a fraction of the slot size and zooms', () => {
        const layout = photoLayout({ x: 0.25, y: -0.5, scale: 2, rotation: 0, grayscale: false }, 40, 20);

        expect(layout.transform).toBe('translate(10mm, -10mm) scale(2) rotate(0deg)');
    });

    it('turns on black and white', () => {
        expect(photoLayout({ ...DEFAULT_PHOTO_TRANSFORM, grayscale: true }, 10, 10).filter).toBe('grayscale(1)');
    });

    it('never zooms out below cover', () => {
        expect(clampScale(0.4)).toBe(1);
        expect(clampScale(Number.NaN)).toBe(1);
        expect(clampScale(3)).toBe(3);
    });
});
