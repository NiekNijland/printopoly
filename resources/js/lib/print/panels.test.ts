import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from './board';
import { splitPanels } from './panels';
import { rectsOverlap, at } from './types';

describe('splitPanels', () => {
    it('makes 4 panels A..D for the default profile', () => {
        const panels = splitPanels(DEFAULT_BOARD_PROFILE);
        expect(panels.map((p) => p.id)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('makes 2 panels for a two-panel profile, full height', () => {
        const panels = splitPanels({ ...DEFAULT_BOARD_PROFILE, panels: 2 });
        expect(panels).toHaveLength(2);
        expect(at(panels, 0).trim).toEqual({ x: 1, y: 1, w: 248, h: 498 });
        expect(at(panels, 1).trim).toEqual({ x: 251, y: 1, w: 248, h: 498 });
    });

    it('ends 1 mm before each fold line and 1 mm inside the outer edge', () => {
        const trims = splitPanels(DEFAULT_BOARD_PROFILE).map((p) => p.trim);
        const a = at(trims, 0);
        const b = at(trims, 1);
        const c = at(trims, 2);
        const d = at(trims, 3);
        expect(a).toEqual({ x: 1, y: 1, w: 248, h: 248 });
        expect(b.x).toBe(251);
        expect(b.x + b.w).toBe(499);
        expect(c.y).toBe(251);
        expect(d.x + d.w).toBe(499);
        expect(d.y + d.h).toBe(499);
    });

    it('panels + fold margins + edge margins add up to the outer size', () => {
        const p = DEFAULT_BOARD_PROFILE;
        const panels = splitPanels(p, { edgeMargin: 1, foldMargin: 1 });
        const rowWidth =
            at(panels, 0).trim.w +
            at(panels, 1).trim.w +
            2 * 1 /* edges */ +
            2 * 1; /* both sides of the fold */
        const colHeight =
            at(panels, 0).trim.h + at(panels, 2).trim.h + 2 * 1 + 2 * 1;
        expect(rowWidth).toBeCloseTo(p.outer, 9);
        expect(colHeight).toBeCloseTo(p.outer, 9);
    });

    it('adds 3 mm bleed and returns the source region and page size', () => {
        const a = at(splitPanels(DEFAULT_BOARD_PROFILE), 0);
        expect(a.source).toEqual({ x: -2, y: -2, w: 254, h: 254 });
        expect(a.size).toEqual({ w: 254, h: 254 });
        expect(a.trimOffset).toEqual({ x: 3, y: 3 });
    });

    it('trim areas never overlap and never touch a fold line', () => {
        const panels = splitPanels(DEFAULT_BOARD_PROFILE);
        for (let i = 0; i < panels.length; i++) {
            for (let j = i + 1; j < panels.length; j++)
                expect(
                    rectsOverlap(at(panels, i).trim, at(panels, j).trim),
                ).toBe(false);
            const t = at(panels, i).trim;
            expect(t.x < 250 && t.x + t.w > 250).toBe(false);
            expect(t.y < 250 && t.y + t.h > 250).toBe(false);
        }
    });
});
