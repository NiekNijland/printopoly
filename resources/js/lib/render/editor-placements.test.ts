import { describe, expect, it } from 'vitest';

import { photo } from '@/testing/edition-test-utils';

import {
    actOnPlacement,
    lidLogoPlacement,
    newPlacement,
    normalizeRotation,
    placementDpi,
    placementQuality,
    startingPlacement,
    type PlacementContext,
} from './editor-placements';

const context: PlacementContext = {
    source: { w: 2000, h: 1000 },
    frame: { w: 40, h: 20 },
    bleed: 0,
};

describe('normalizeRotation', () => {
    it('rounds to a quarter turn within one full turn', () => {
        expect(normalizeRotation(0)).toBe(0);
        expect(normalizeRotation(100)).toBe(90);
        expect(normalizeRotation(450)).toBe(90);
        expect(normalizeRotation(-90)).toBe(270);
        expect(normalizeRotation(-360)).toBe(0);
    });
});

describe('startingPlacement', () => {
    it('starts a landscape photo in the middle at 100%', () => {
        expect(startingPlacement('p1', { width: 2000, height: 1000 })).toEqual({
            photoId: 'p1',
            cx: 0.5,
            cy: 0.5,
            scale: 1,
            rotation: 0,
            grayscale: false,
        });
    });

    it('starts a standing photo higher up on its face line', () => {
        expect(
            startingPlacement('p1', { width: 1000, height: 2000 }).cy,
        ).toBeCloseTo(1 / 3, 6);
        expect(
            startingPlacement(
                'p1',
                { width: 1000, height: 2000 },
                { w: 40, h: 20 },
            ).cy,
        ).toBeCloseTo(1 / 3 + 0.25 / 6, 6);
    });

    it('keeps the middle off the fold only when asked and the target is known', () => {
        const size = { width: 2000, height: 1000 };
        const target = { w: 20, h: 20 };

        expect(startingPlacement('p1', size, target, true).cx).toBeCloseTo(
            0.625,
            6,
        );
        expect(startingPlacement('p1', size, target).cx).toBe(0.5);
        expect(startingPlacement('p1', size, undefined, true).cx).toBe(0.5);
    });
});

describe('newPlacement', () => {
    it('covers the frame, centred, at 100%', () => {
        expect(newPlacement('p2', context)).toEqual({
            photoId: 'p2',
            cx: 0.5,
            cy: 0.5,
            scale: 1,
            rotation: 0,
            grayscale: false,
        });
    });
});

describe('actOnPlacement', () => {
    const zoomed = actOnPlacement(photo('p1'), context, {
        type: 'zoom-to',
        scale: 2,
    });

    it('zooms to a scale and by a step', () => {
        expect(zoomed.scale).toBe(2);
        expect(
            actOnPlacement(zoomed, context, { type: 'zoom-by', delta: 0.5 })
                .scale,
        ).toBe(2.5);
    });

    it('keeps the frame covered when zooming out below 100%', () => {
        expect(
            actOnPlacement(photo('p1'), context, {
                type: 'zoom-to',
                scale: 0.5,
            }).scale,
        ).toBe(1);
    });

    it('pans the picture with the pointer and stops at the edge', () => {
        expect(
            actOnPlacement(zoomed, context, { type: 'pan', dxMm: 5, dyMm: 0 })
                .cx,
        ).toBeCloseTo(0.4375, 6);
        expect(
            actOnPlacement(zoomed, context, { type: 'pan', dxMm: 100, dyMm: 0 })
                .cx,
        ).toBeCloseTo(0.25, 6);
    });

    it('nudges the photo half a millimetre per press, so the crop moves the other way', () => {
        const moved = actOnPlacement(zoomed, context, {
            type: 'nudge',
            direction: 'down',
        });

        expect(moved.cy).toBeCloseTo(0.5 - 0.5 / 0.04 / 1000, 6);
        expect(moved.cx).toBe(0.5);
    });

    it('rotates a quarter turn either way', () => {
        expect(
            actOnPlacement(photo('p1'), context, { type: 'rotate', turns: 1 })
                .rotation,
        ).toBe(90);
        expect(
            actOnPlacement(photo('p1'), context, { type: 'rotate', turns: -1 })
                .rotation,
        ).toBe(270);
    });

    it('switches grey on and off', () => {
        expect(
            actOnPlacement(photo('p1'), context, {
                type: 'grayscale',
                on: true,
            }).grayscale,
        ).toBe(true);
    });

    it('switches fit on and back off, starting again at 100%', () => {
        const fitted = actOnPlacement(zoomed, context, {
            type: 'fit',
            on: true,
        });

        expect(fitted.fit).toBe(true);
        expect(fitted.scale).toBe(1);
        expect(
            actOnPlacement(fitted, context, { type: 'fit', on: false }),
        ).not.toHaveProperty('fit');
    });
});

describe('placementDpi and placementQuality', () => {
    it('measures the dpi as the photo prints', () => {
        expect(placementDpi(photo('p1'), context)).toBeCloseTo(1270, 6);
        expect(placementDpi({ ...photo('p1'), scale: 2 }, context)).toBeCloseTo(
            635,
            6,
        );
    });

    it('calls a small photo on a large frame not sharp and says what it needs', () => {
        const quality = placementQuality(photo('p1'), {
            source: { w: 200, h: 100 },
            frame: { w: 40, h: 20 },
            bleed: 3,
        });

        expect(quality.sharp).toBe(false);
        expect(quality.printed).toEqual({ w: 46, h: 26 });
        expect(quality.needed.w).toBeGreaterThan(200);
    });
});

describe('lidLogoPlacement', () => {
    it('puts the logo whole and centred, keeping its turn and colours', () => {
        expect(
            lidLogoPlacement({
                ...photo('logo'),
                cx: 0.2,
                cy: 0.8,
                scale: 2,
                rotation: 180,
                grayscale: true,
            }),
        ).toEqual({
            photoId: 'logo',
            cx: 0.5,
            cy: 0.5,
            scale: 1,
            rotation: 180,
            grayscale: true,
            fit: true,
        });
    });
});
