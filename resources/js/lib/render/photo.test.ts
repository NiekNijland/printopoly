import { describe, expect, it } from 'vitest';

import { photoLayout } from './photo';

const base = {
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    grayscale: false,
} as const;

describe('photoLayout', () => {
    it('covers the slot without a transform', () => {
        const layout = photoLayout({ src: 'a.jpg' }, 40, 20);

        expect(layout.box).toEqual({ left: 0, top: 0, width: 40, height: 20 });
        expect(layout.transform).toBe('rotate(0deg)');
        expect(layout.filter).toBeUndefined();
    });

    it('fills the slot with a photo of another aspect ratio and centres it', () => {
        const layout = photoLayout(
            { src: 'a.jpg', width: 4000, height: 3000, transform: base },
            40,
            20,
        );

        expect(layout.box).toEqual({ left: 0, top: -5, width: 40, height: 30 });
    });

    it('zooms around the centre of the visible area', () => {
        const layout = photoLayout(
            {
                src: 'a.jpg',
                width: 4000,
                height: 3000,
                transform: { ...base, scale: 2 },
            },
            40,
            30,
        );

        expect(layout.box).toEqual({
            left: -20,
            top: -15,
            width: 80,
            height: 60,
        });
    });

    it('shows the left part of the photo when the centre moves left', () => {
        const layout = photoLayout(
            {
                src: 'a.jpg',
                width: 4000,
                height: 3000,
                transform: { ...base, scale: 2, x: 0.25 },
            },
            40,
            30,
        );

        expect(layout.box.left).toBe(0);
    });

    it('swaps the aspect ratio for quarter turns and still covers the slot', () => {
        const layout = photoLayout(
            {
                src: 'a.jpg',
                width: 4000,
                height: 3000,
                transform: { ...base, rotation: 90 },
            },
            30,
            40,
        );

        // Turned, the photo is 3000 x 4000 px: it covers 30 x 40 mm exactly.
        expect(layout.box).toEqual({ left: -5, top: 5, width: 40, height: 30 });
        expect(layout.transform).toBe('rotate(90deg)');
    });

    it('turns on black and white', () => {
        expect(
            photoLayout(
                { src: 'a.jpg', transform: { ...base, grayscale: true } },
                10,
                10,
            ).filter,
        ).toBe('grayscale(1)');
    });

    it('never zooms out below cover', () => {
        const layout = photoLayout(
            { src: 'a.jpg', transform: { ...base, scale: 0.4 } },
            10,
            10,
        );

        expect(layout.box.width).toBe(10);
    });
});
