import { describe, expect, it } from 'vitest';
import { coverTransform } from '@/testing/photo-transform';
import type { PhotoTransform } from '@/types/photos';
import type { Size } from '@/types/print';
import {
    photoQuality,
    placementTarget,
    resolutionLabel,
} from './photos-resolution';
import { rotateQuarter, setZoom } from './photos-transform';

const effectiveDpi = (source: Size, t: PhotoTransform, target: Size): number =>
    photoQuality(source, t, target, 0).dpi;

const isSharpEnough = (
    dpi: number,
    target: Size = { w: 25.4, h: 25.4 },
): boolean =>
    photoQuality(
        { w: (dpi * target.w) / 25.4, h: (dpi * target.h) / 25.4 },
        { x: 0.5, y: 0.5, scale: 1, rotation: 0, grayscale: false },
        target,
        0,
    ).sharp;

describe('effectiveDpi', () => {
    it('is pixels per inch of the photo on the target', () => {
        // 3000 px across 25.4 mm is exactly 3000 dpi when the photo is exactly as wide as the target.
        const target = { w: 25.4, h: 25.4 };
        expect(
            effectiveDpi(
                { w: 3000, h: 3000 },
                coverTransform({ w: 3000, h: 3000 }, target),
                target,
            ),
        ).toBeCloseTo(3000, 9);
    });

    it('includes the bleed: the same photo has fewer dpi on a larger target', () => {
        const source = { w: 2000, h: 1500 };
        const t = coverTransform(source, { w: 100, h: 75 });
        const noBleed = effectiveDpi(
            source,
            t,
            placementTarget({ w: 100, h: 75 }, 0),
        );
        const bleed = effectiveDpi(
            source,
            t,
            placementTarget({ w: 100, h: 75 }, 3),
        );
        expect(bleed).toBeLessThan(noBleed);
    });

    it('drops when zoomed in and rises when zoomed out', () => {
        const source = { w: 2000, h: 1500 };
        const target = { w: 60, h: 40 };
        const t1 = coverTransform(source, target);
        const t2 = setZoom(source, t1, target, 2);
        expect(effectiveDpi(source, t2, target)).toBeCloseTo(
            effectiveDpi(source, t1, target) / 2,
            6,
        );
    });

    it('is independent of rotation for a square-covered result', () => {
        const source = { w: 2000, h: 2000 };
        const target = { w: 50, h: 50 };
        const t = coverTransform(source, target);
        expect(
            effectiveDpi(source, rotateQuarter(source, t, target, 1), target),
        ).toBeCloseTo(effectiveDpi(source, t, target), 9);
    });
});

describe('thresholds and labels', () => {
    it('is neutral from 150 dpi (B94), judged on the rounded value shown to the user', () => {
        expect(isSharpEnough(150)).toBe(true);
        expect(isSharpEnough(149.6)).toBe(true);
        expect(isSharpEnough(149.4)).toBe(false);
    });

    it('labels like the design, and says how big a small photo should be (B251)', () => {
        const sharp = { sharp: true, needed: { w: 100, h: 100 } };
        expect(resolutionLabel(sharp, 'nl')).toBe('Scherp genoeg');
        expect(resolutionLabel(sharp, 'en')).toBe('Sharp enough');
        expect(
            resolutionLabel({ sharp: false, needed: { w: 600, h: 450 } }, 'nl'),
        ).toContain('ongeveer 600 × 450 px');
    });

    it('asks less of a large print, looked at from further away (B251)', () => {
        expect(isSharpEnough(120, { w: 40, h: 60 })).toBe(false);
        expect(isSharpEnough(120, { w: 243, h: 120 })).toBe(true);
        expect(isSharpEnough(100, { w: 336, h: 336 })).toBe(true);
        expect(isSharpEnough(99, { w: 336, h: 336 })).toBe(false);
    });

    it('measures the photo on its real target and names the pixels it needs', () => {
        // 320 × 240 over a whole space of 41 × 66 mm with 2.5 mm bleed: far too small.
        const small = photoQuality(
            { w: 320, h: 240 },
            { x: 0.5, y: 0.5, scale: 1, rotation: 0, grayscale: false },
            { w: 41, h: 66 },
            2.5,
        );
        expect(small.sharp).toBe(false);
        expect(Math.round(small.dpi)).toBe(86);
        // Same shape, scaled up to 150 dpi, the long side rounded up to 50 px.
        expect(small.needed).toEqual({ w: 600, h: 450 });
        expect(small.printed).toEqual({ w: 46, h: 71 });

        // A scan of 3000 × 2000 over the whole centre of the board is fine (Kees).
        const centre = photoQuality(
            { w: 3000, h: 2000 },
            { x: 0.5, y: 0.5, scale: 1, rotation: 0, grayscale: false },
            { w: 360, h: 360 },
            0,
        );
        expect(centre.sharp).toBe(true);
    });
});
