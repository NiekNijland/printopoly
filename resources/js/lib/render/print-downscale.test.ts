import { describe, expect, it, vi } from 'vitest';

import { makeEdition } from '@/testing/edition-test-utils';

import { downscaleForPrint, photoNeeds } from './print-downscale';

const printSize = async (
    width: number,
    height: number,
    frameMm: number,
): Promise<{ width: number; height: number } | null> => {
    vi.stubGlobal(
        'createImageBitmap',
        vi.fn<() => Promise<ImageBitmap>>(() =>
            Promise.resolve({ width, height, close: () => undefined }),
        ),
    );
    const setWidth = vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set');
    const setHeight = vi.spyOn(HTMLCanvasElement.prototype, 'height', 'set');
    await downscaleForPrint(
        new Blob(['x'], { type: 'image/jpeg' }),
        width,
        height,
        frameMm,
    );
    const drawn = setWidth.mock.lastCall?.[0];
    const drawnHeight = setHeight.mock.lastCall?.[0];
    vi.restoreAllMocks();

    return drawn === undefined || drawnHeight === undefined
        ? null
        : { width: drawn, height: drawnHeight };
};

describe('photos for print (round 4, bug 11)', () => {
    it('makes a phone photo for a small space much smaller, never below 300 dpi', async () => {
        // A 4000 × 3000 photo on a space of about 30 mm: 300 dpi needs about 410 px on the short side.
        const size = await printSize(4000, 3000, 30);

        expect(size).not.toBeNull();
        expect(
            Math.min(size?.width ?? 0, size?.height ?? 0),
        ).toBeGreaterThanOrEqual(Math.ceil((30 / 25.4) * 300));
        expect(size?.width).toBeLessThan(1000);
        // The photo keeps its shape.
        expect((size?.width ?? 0) / (size?.height ?? 1)).toBeCloseTo(4 / 3, 2);
    });

    it('leaves a photo alone when it has about what the paper needs', async () => {
        expect(await printSize(1200, 900, 250)).toBeNull();
        expect(await printSize(4000, 3000, 0)).toBeNull();
    });

    it('counts the largest frame and the zoom of every use of a photo', () => {
        const edition = {
            ...makeEdition(),
            elements: {
                'space.01': {
                    photo: {
                        photoId: 'p1',
                        cx: 0.5,
                        cy: 0.5,
                        scale: 2,
                        rotation: 0,
                        grayscale: false,
                    },
                },
                'deed.01': {
                    photo: {
                        photoId: 'p1',
                        cx: 0.5,
                        cy: 0.5,
                        scale: 1,
                        rotation: 0,
                        grayscale: false,
                    },
                },
            },
        };
        const needs = photoNeeds(edition, {
            printer: {
                'space.01#photo': { w: 22, h: 30 },
                'deed.01#photo': { w: 57, h: 40 },
            },
            home: { 'space.01#photo': { w: 20, h: 28 } },
        });

        // 30 mm at twice the zoom against 57 mm at none: the deed wins.
        expect(needs.get('p1')).toBe(60);
    });
});
