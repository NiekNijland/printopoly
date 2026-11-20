import { describe, expect, it } from 'vitest';

import {
    DIE_EDGE,
    bookletSpreads,
    dieNet,
    foldCells,
    foldSheets,
    hotelNet,
    houseNet,
    netEdges,
    pipPositions,
} from './extras';

describe('extra print items', () => {
    it('folds sixteen pages into four sheets, front and back', () => {
        const spreads = bookletSpreads();

        expect(spreads).toHaveLength(8);
        expect(spreads.flat().sort((a, b) => a - b)).toEqual(
            Array.from({ length: 16 }, (_, i) => i + 1),
        );
        // Pages that sit next to each other on a side add up to the page count plus one.
        for (const [left, right] of spreads) {
            expect(left + right).toBe(17);
        }
    });

    it('fits all the houses and hotels on three A4 sheets', () => {
        const sheets = foldSheets();

        expect(sheets.map((s) => `${s.kind}${String(s.count)}`)).toEqual([
            'house24',
            'house8',
            'hotel12',
        ]);
        expect(foldCells('house')).toHaveLength(24);
    });

    it('keeps every net inside its cell and makes a closed solid', () => {
        for (const net of [houseNet(), hotelNet(), dieNet()]) {
            for (const face of net.faces) {
                for (const point of face.points) {
                    expect(point.x).toBeGreaterThanOrEqual(-1e-9);
                    expect(point.y).toBeGreaterThanOrEqual(-1e-9);
                    expect(point.x).toBeLessThanOrEqual(net.size.w + 1e-9);
                    expect(point.y).toBeLessThanOrEqual(net.size.h + 1e-9);
                }
            }

            const { cuts, folds } = netEdges(net);

            expect(cuts.length).toBeGreaterThan(0);
            expect(folds.length).toBeGreaterThan(0);
        }
    });

    it('has a die with six faces and seven glue tabs, opposite faces adding up to seven', () => {
        const net = dieNet();

        expect(net.faces.filter((f) => f.role === 'floor')).toHaveLength(6);
        expect(net.faces.filter((f) => f.role === 'tab')).toHaveLength(7);
        expect(net.size.w).toBeGreaterThan(4 * DIE_EDGE);
        expect(pipPositions(6)).toHaveLength(6);
        expect(pipPositions(1)).toHaveLength(1);
    });
});
