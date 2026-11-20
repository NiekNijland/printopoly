import { describe, expect, it } from 'vitest';
import {
    cropSpec,
    effectiveDpi,
    isSharpEnough,
    placementTarget,
    resolutionLabel,
} from './resolution';
import { coverTransform, nudge, rotateQuarter, setZoom } from './transform';

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

    it('labels like the design', () => {
        expect(resolutionLabel(284.2, 'nl')).toBe(
            'Resolutie 284 dpi, scherp genoeg',
        );
        expect(resolutionLabel(284.2, 'en')).toBe(
            'Resolution 284 dpi, sharp enough',
        );
        expect(resolutionLabel(112, 'nl')).toBe('Resolutie 112 dpi, te laag');
    });
});

describe('cropSpec', () => {
    it('crops the whole photo at 100% when its aspect ratio matches', () => {
        const source = { w: 1800, h: 1200 };
        const target = { w: 90, h: 60 };
        const c = cropSpec(source, coverTransform(source, target), target);
        expect(c.rect).toEqual({ x: 0, y: 0, w: 1800, h: 1200 });
        expect(c.sourceDpi).toBeCloseTo(508, 0);
        expect(c.outputDpi).toBe(300);
        expect(c.output).toEqual({ w: 1063, h: 709 });
    });

    it('never upsamples: output dpi equals source dpi below 300', () => {
        const source = { w: 900, h: 600 };
        const target = { w: 90, h: 60 };
        const c = cropSpec(source, coverTransform(source, target), target);
        expect(c.outputDpi).toBeCloseTo(254, 6);
        expect(c.output.w).toBeCloseTo(900, 0);
    });

    it('crops a centred window at 200% zoom', () => {
        const source = { w: 4000, h: 3000 };
        const target = { w: 80, h: 60 };
        const c = cropSpec(
            source,
            setZoom(source, coverTransform(source, target), target, 2),
            target,
        );
        expect(c.rect).toEqual({ x: 1000, y: 750, w: 2000, h: 1500 });
    });

    it('crops a panned window and keeps it inside the photo', () => {
        const source = { w: 4000, h: 3000 };
        const target = { w: 80, h: 60 };
        let t = setZoom(source, coverTransform(source, target), target, 2);
        t = nudge(source, t, target, 'left', 1000); // far past the edge
        const c = cropSpec(source, t, target);
        expect(c.rect.x + c.rect.w).toBe(4000);
        expect(c.rect.x).toBe(2000);
    });

    it('maps the rectangle back to the original orientation for quarter turns', () => {
        const source = { w: 4000, h: 3000 };
        const target = { w: 60, h: 80 };
        const base = coverTransform(source, target, 90);
        const c90 = cropSpec(source, base, target);
        // Rotated photo is 3000 x 4000, exactly the target's shape: the whole photo is used.
        expect(c90.rect).toEqual({ x: 0, y: 0, w: 4000, h: 3000 });
        expect(c90.rotation).toBe(90);

        // Zoom 2 and move to the top of the rotated photo: after a clockwise turn the top is the original's left.
        let t = setZoom(source, base, target, 2);
        t = { ...t, y: 0 };
        t = setZoom(source, t, target, 2); // reclamp
        const c = cropSpec(source, t, target);
        expect(c.rect.x).toBe(0);
        expect(c.rect.w).toBe(2000);
        expect(c.rect.h).toBe(1500);
    });

    it('handles 180 and 270 degrees', () => {
        const source = { w: 4000, h: 3000 };
        const target = { w: 80, h: 60 };
        for (const rot of [180, 270] as const) {
            const t = setZoom(
                source,
                coverTransform(
                    source,
                    rot === 270 ? { w: 60, h: 80 } : target,
                    rot,
                ),
                rot === 270 ? { w: 60, h: 80 } : target,
                2,
            );
            const c = cropSpec(
                source,
                t,
                rot === 270 ? { w: 60, h: 80 } : target,
            );
            expect(c.rect.x + c.rect.w).toBeLessThanOrEqual(4000);
            expect(c.rect.y + c.rect.h).toBeLessThanOrEqual(3000);
            expect(c.rect).toMatchObject({ w: 2000, h: 1500 });
        }
    });

    it('anchors the top-left of the rotated photo at the right corner of the original', () => {
        const source = { w: 4000, h: 3000 };
        const target = { w: 80, h: 60 };
        const topLeft = (rot: 180 | 270, box: { w: number; h: number }) =>
            cropSpec(
                source,
                setZoom(
                    source,
                    { ...coverTransform(source, box, rot), x: 0, y: 0 },
                    box,
                    2,
                ),
                box,
            ).rect;
        // 180: top-left of the turned photo is the bottom-right of the original.
        expect(topLeft(180, target)).toEqual({
            x: 2000,
            y: 1500,
            w: 2000,
            h: 1500,
        });
        // 270 (anticlockwise quarter): top-left of the turned photo is the top-right of the original.
        expect(topLeft(270, { w: 60, h: 80 })).toEqual({
            x: 2000,
            y: 0,
            w: 2000,
            h: 1500,
        });
    });

    it('carries grayscale into the spec', () => {
        const source = { w: 1000, h: 1000 };
        const target = { w: 50, h: 50 };
        expect(
            cropSpec(source, coverTransform(source, target, 0, true), target)
                .grayscale,
        ).toBe(true);
    });
});
