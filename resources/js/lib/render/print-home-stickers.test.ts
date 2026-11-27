import { describe, expect, it } from 'vitest';
import { defined } from '@/testing/defined';
import { rectsOverlap, at } from '../../types/print';
import { DEFAULT_BOARD_PROFILE, centerRect, spaceRects } from './print-board';
import { packStickers, stickerPieces } from './print-home-stickers';

describe('stickerPieces', () => {
    const pieces = stickerPieces(DEFAULT_BOARD_PROFILE);

    it('has 40 space stickers and 4 centre pieces', () => {
        expect(pieces.filter((p) => p.kind === 'space')).toHaveLength(40);
        expect(pieces.filter((p) => p.kind === 'center')).toHaveLength(4);
    });

    it('is 0.5 mm smaller than the space on every side', () => {
        const spaces = spaceRects(DEFAULT_BOARD_PROFILE);
        for (const p of pieces.filter((x) => x.kind === 'space')) {
            const s = at(spaces, defined(p.position));
            expect(p.trim.x - s.x).toBeCloseTo(0.5, 9);
            expect(p.trim.y - s.y).toBeCloseTo(0.5, 9);
            expect(s.x + s.w - (p.trim.x + p.trim.w)).toBeCloseTo(0.5, 9);
            expect(s.y + s.h - (p.trim.y + p.trim.h)).toBeCloseTo(0.5, 9);
        }
    });

    it('splits the centre in 4 along the fold lines', () => {
        const c = centerRect(DEFAULT_BOARD_PROFILE);
        const centers = pieces.filter((p) => p.kind === 'center');
        for (const p of centers) {
            expect(p.trim.x < 250 && p.trim.x + p.trim.w > 250).toBe(false);
            expect(p.trim.y < 250 && p.trim.y + p.trim.h > 250).toBe(false);
            expect(p.trim.w).toBeCloseTo(c.w / 2 - 1, 9);
        }
    });

    it('adds bleed around the trim', () => {
        expect(at(pieces, 1).size.w).toBeCloseTo(40 - 1 + 6, 9);
        expect(at(pieces, 1).size.h).toBeCloseTo(70 - 1 + 6, 9);
    });
});

describe('packStickers', () => {
    const pieces = stickerPieces(DEFAULT_BOARD_PROFILE);
    const sheets = packStickers(pieces);

    it('places every piece exactly once', () => {
        const ids = sheets.flatMap((s) => s.placements.map((p) => p.id)).sort();
        expect(ids).toEqual(pieces.map((p) => p.id).sort());
    });

    it('stays in the 8 mm safe area, keeps 3 mm gaps and does not overlap', () => {
        for (const sheet of sheets) {
            for (const p of sheet.placements) {
                expect(p.x).toBeGreaterThanOrEqual(8 - 1e-9);
                expect(p.y).toBeGreaterThanOrEqual(8 - 1e-9);
                expect(p.x + p.w).toBeLessThanOrEqual(202 + 1e-9);
                expect(p.y + p.h).toBeLessThanOrEqual(289 + 1e-9);
            }
            for (let i = 0; i < sheet.placements.length; i++) {
                for (let j = i + 1; j < sheet.placements.length; j++) {
                    const a = at(sheet.placements, i);
                    const b = at(sheet.placements, j);
                    const grown = {
                        x: a.x - 2.999,
                        y: a.y - 2.999,
                        w: a.w + 5.998,
                        h: a.h + 5.998,
                    };
                    expect(rectsOverlap(grown, b), `${a.id} vs ${b.id}`).toBe(
                        false,
                    );
                }
            }
        }
    });

    it('is deterministic', () => {
        expect(packStickers(pieces)).toEqual(sheets);
    });

    it('fails clearly when a centre piece does not fit A4', () => {
        const big = { ...DEFAULT_BOARD_PROFILE, outer: 700, corner: 70 };
        expect(() => packStickers(stickerPieces(big))).toThrow(
            /Stikker "center\.\w+".*past niet op een vel/,
        );
    });

    it('accepts the largest default piece (centre incl. bleed)', () => {
        expect(Math.max(...pieces.map((p) => p.size.w))).toBeLessThanOrEqual(
            194,
        );
    });
});
