import { describe, expect, it } from 'vitest';
import { rectsOverlap, at } from '../../types/print';
import {
    SHEET_PRESETS,
    duplexCardSheets,
    impose,
    mirrorX,
    moneySheets,
    printShopCardPages,
    sheetLabel,
    type Imposition,
} from './print-imposition';

function expectSafe(result: Imposition, margin: number) {
    for (const sheet of result.sheets) {
        for (const it of sheet.items) {
            expect(it.bleed.x).toBeGreaterThanOrEqual(margin - 1e-9);
            expect(it.bleed.y).toBeGreaterThanOrEqual(margin - 1e-9);
            expect(it.bleed.x + it.bleed.w).toBeLessThanOrEqual(
                result.sheet.w - margin + 1e-9,
            );
            expect(it.bleed.y + it.bleed.h).toBeLessThanOrEqual(
                result.sheet.h - margin + 1e-9,
            );
        }
        for (let i = 0; i < sheet.items.length; i++) {
            for (let j = i + 1; j < sheet.items.length; j++) {
                expect(
                    rectsOverlap(
                        at(sheet.items, i).bleed,
                        at(sheet.items, j).bleed,
                    ),
                ).toBe(false);
            }
        }
        for (const s of sheet.cropMarks) {
            for (const [x, y] of [
                [s.x1, s.y1],
                [s.x2, s.y2],
            ]) {
                expect(x).toBeGreaterThanOrEqual(0);
                expect(y).toBeGreaterThanOrEqual(0);
                expect(x).toBeLessThanOrEqual(result.sheet.w);
                expect(y).toBeLessThanOrEqual(result.sheet.h);
            }
        }
    }
}

describe('presets', () => {
    it('has the right sizes', () => {
        expect(SHEET_PRESETS.A4).toEqual({ w: 210, h: 297 });
        expect(SHEET_PRESETS.A3).toEqual({ w: 297, h: 420 });
        expect(SHEET_PRESETS.SRA3).toEqual({ w: 320, h: 450 });
    });
});

describe('sheetLabel', () => {
    it('formats ranges', () => {
        expect(sheetLabel('Kans', 1, 4)).toBe('Kans 1 t/m 4');
        expect(sheetLabel('Kans', 5, 5)).toBe('Kans 5');
        expect(sheetLabel(undefined, 1, 2)).toBe('1 t/m 2');
    });
});

describe('impose', () => {
    it('never places items outside the safe area, for all presets and a range of sizes', () => {
        for (const sheet of ['A4', 'A3', 'SRA3'] as const) {
            for (const item of [
                { w: 63, h: 88 },
                { w: 126, h: 88 },
                { w: 130, h: 60 },
                { w: 40, h: 25 },
            ]) {
                for (const bleed of [0, 3]) {
                    const r = impose({
                        item,
                        bleed,
                        sheet,
                        margin: 8,
                        gap: 3,
                        count: 57,
                        cropMarks: true,
                    });
                    expectSafe(r, 8);
                    expect(r.sheets.flatMap((s) => s.items)).toHaveLength(57);
                }
            }
        }
    });

    it('picks the best orientation', () => {
        const r = impose({
            item: { w: 126, h: 88 },
            bleed: 3,
            sheet: 'A4',
            margin: 8,
            gap: 3,
            count: 4,
        });
        expect(r.orientation).toBe('landscape');
        expect(r.sheet).toEqual({ w: 297, h: 210 });
        const t = impose({
            item: { w: 88, h: 126 },
            bleed: 3,
            sheet: 'A4',
            margin: 8,
            gap: 3,
            count: 4,
        });
        expect(t.orientation).toBe('portrait');
    });

    it('labels sheets with ranges', () => {
        const r = impose({
            item: { w: 63, h: 88 },
            bleed: 3,
            sheet: 'A4',
            margin: 8,
            gap: 3,
            count: 16,
            labelPrefix: 'Kans',
        });
        expect(r.sheets.map((s) => s.label)).toEqual([
            'Kans 1 t/m 6',
            'Kans 7 t/m 12',
            'Kans 13 t/m 16',
        ]);
    });

    it('throws a Dutch error when an item does not fit', () => {
        expect(() =>
            impose({
                item: { w: 400, h: 400 },
                bleed: 3,
                sheet: 'A4',
                margin: 8,
                gap: 3,
                count: 1,
            }),
        ).toThrow(/past niet op/);
    });

    it('draws crop marks outside the bleed, away from the art', () => {
        const r = impose({
            item: { w: 63, h: 88 },
            bleed: 3,
            sheet: 'A4',
            margin: 8,
            gap: 3,
            count: 1,
            cropMarks: true,
        });
        const s = at(r.sheets, 0);
        expect(s.cropMarks).toHaveLength(8);
        for (const m of s.cropMarks) {
            const seg = {
                x: Math.min(m.x1, m.x2),
                y: Math.min(m.y1, m.y2),
                w: Math.abs(m.x2 - m.x1),
                h: Math.abs(m.y2 - m.y1),
            };
            expect(
                rectsOverlap(
                    { ...seg, w: seg.w || 0.001, h: seg.h || 0.001 },
                    at(s.items, 0).bleed,
                ),
            ).toBe(false);
        }
    });
});

describe('duplexCardSheets', () => {
    it('puts 9 cards with 1.5 mm bleed on A4 portrait, 3 mm apart', () => {
        const r = duplexCardSheets(60, undefined, 'Kaarten');
        expect(r.perSheet).toBe(9);
        expect(r.cols).toBe(3);
        expect(r.sheet).toEqual({ w: 210, h: 297 });
        expect(r.pages).toHaveLength(7);
        const items = at(r.pages, 0).front.items;
        expect(at(items, 0).trim).toMatchObject({ w: 63, h: 88 });
        expect(at(items, 1).trim.x - at(items, 0).trim.x).toBeCloseTo(66, 9);
        expect(at(items, 0).bleed.w).toBeCloseTo(66, 9);
        expect(at(r.pages, 0).front.label).toBe('Kaarten 1 t/m 9');
        expectSafe(
            {
                sheet: r.sheet,
                orientation: 'portrait',
                cols: r.cols,
                rows: r.rows,
                perSheet: r.perSheet,
                sheets: r.pages.flatMap((p) => [p.front, p.back]),
            },
            3,
        );
    });

    it('mirrors every back left to right behind its own front', () => {
        for (const { front, back } of duplexCardSheets(13).pages) {
            expect(back.items.map((it) => it.index)).toEqual(
                front.items.map((it) => it.index),
            );
            back.items.forEach((it, i) => {
                const twin = at(front.items, i);
                expect(it.trim.x + it.trim.w / 2).toBeCloseTo(
                    210 - (twin.trim.x + twin.trim.w / 2),
                    9,
                );
                expect(it.trim.y).toBe(twin.trim.y);
                expect(it.col).toBe(2 - twin.col);
            });
        }
    });

    it('puts the crop marks only in the margin, in line with every trim edge', () => {
        const { front, back } = at(duplexCardSheets(9).pages, 0);
        // 6 vertical cut lines (top and bottom) and 6 horizontal ones (left and right).
        expect(front.cropMarks).toHaveLength(24);
        for (const s of front.cropMarks) {
            for (const it of front.items) {
                expect(
                    rectsOverlap(
                        {
                            x: Math.min(s.x1, s.x2),
                            y: Math.min(s.y1, s.y2),
                            w: Math.abs(s.x2 - s.x1) || 0.001,
                            h: Math.abs(s.y2 - s.y1) || 0.001,
                        },
                        it.bleed,
                    ),
                ).toBe(false);
            }
        }
        expect(back.cropMarks.map((s) => s.x1).sort()).toEqual(
            front.cropMarks.map((s) => 210 - s.x1).sort(),
        );
    });

    it('mirrors a box over the width of the page', () => {
        expect(mirrorX({ x: 10, y: 5, w: 63, h: 88 }, 210)).toEqual({
            x: 137,
            y: 5,
            w: 63,
            h: 88,
        });
    });
});

describe('moneySheets', () => {
    it('fits 6 default notes on A4 landscape and 35 sheets for 210 notes', () => {
        const r = moneySheets();
        expect(r.perSheet).toBe(6);
        expect(r.orientation).toBe('landscape');
        expect(r.sheets).toHaveLength(35);
        expect(r.sheets.reduce((n, s) => n + s.items.length, 0)).toBe(210);
        expectSafe(r, 8);
    });

    it('fits 14 notes on SRA3 and 15 sheets for 210 notes', () => {
        const r = moneySheets(undefined, 'SRA3');
        expect(r.perSheet).toBe(14);
        expect(r.sheets).toHaveLength(15);
        expect(r.sheets.at(-1)!.items).toHaveLength(210 - 14 * 14);
        expectSafe(r, 5);
    });

    it('follows a custom note size', () => {
        expect(moneySheets({ w: 60, h: 40 }).perSheet).toBeGreaterThan(6);
    });
});

describe('printShopCardPages', () => {
    it('makes front and back pages alternately, 69 x 94 mm, no crop marks', () => {
        const pages = printShopCardPages(3);
        expect(pages).toHaveLength(6);
        expect(pages.map((p) => `${p.card}${p.side[0]}`)).toEqual([
            '0f',
            '0b',
            '1f',
            '1b',
            '2f',
            '2b',
        ]);
        expect(pages.every((p) => p.size.w === 69 && p.size.h === 94)).toBe(
            true,
        );
        expect(at(pages, 0).trim).toEqual({ x: 3, y: 3, w: 63, h: 88 });
        expect(pages.every((p) => !('cropMarks' in p))).toBe(true);
    });
});
