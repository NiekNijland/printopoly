import { describe, expect, it } from 'vitest';

import { LID_OVERLAP, lidTiles } from './lid-tiles';

describe('the box lid on A4 at home (R5-29)', () => {
    it('cuts the standard lid in two pieces that overlap, with a dashed line where the second lies', () => {
        const { page, tiles } = lidTiles({ w: 267, h: 267 });

        expect(page).toEqual({ w: 210, h: 297 });
        expect(tiles).toHaveLength(2);
        const [left, right] = tiles;

        // The left piece runs on past the middle: the strip the right piece lies on.
        expect(left?.visible).toEqual({
            x: -3,
            y: -3,
            w: 136.5 + LID_OVERLAP,
            h: 273,
        });
        expect(left?.cut).toEqual({
            x: 0,
            y: 0,
            w: 133.5 + LID_OVERLAP,
            h: 267,
        });
        expect(left?.guides).toEqual([
            { x1: 133.5, y1: -3, x2: 133.5, y2: 270 },
        ]);
        // The right piece is cut on its edge, with picture past it in case the knife is off.
        expect(right?.visible).toEqual({ x: 130.5, y: -3, w: 139.5, h: 273 });
        expect(right?.cut).toEqual({ x: 133.5, y: 0, w: 133.5, h: 267 });
        expect(right?.guides).toEqual([]);

        // Every piece fits on its sheet with 10 mm to spare.
        for (const tile of tiles) {
            expect(tile.visible.w).toBeLessThanOrEqual(190);
            expect(tile.visible.h).toBeLessThanOrEqual(277);
        }
    });

    it('keeps a lid that fits on one sheet whole, landscape when that is what fits', () => {
        expect(lidTiles({ w: 150, h: 200 }).tiles).toHaveLength(1);
        expect(lidTiles({ w: 250, h: 150 })).toMatchObject({
            page: { w: 297, h: 210 },
            tiles: [{ cut: { x: 0, y: 0, w: 250, h: 150 } }],
        });
    });
});
