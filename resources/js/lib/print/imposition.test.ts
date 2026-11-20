import { describe, expect, it } from 'vitest';
import {
    SHEET_PRESETS,
    foldCardSheets,
    impose,
    moneySheets,
    printShopCardPages,
    sheetLabel,
    type Imposition,
} from './imposition';
import { rectsOverlap, at } from './types';

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

describe('foldCardSheets', () => {
    it('puts 4 fold cards (126 x 88) on an A4 landscape sheet', () => {
        const r = foldCardSheets(8, 'Kans');
        expect(r.perSheet).toBe(4);
        expect(r.sheet).toEqual({ w: 297, h: 210 });
        expect(r.sheets).toHaveLength(2);
        expect(at(at(r.sheets, 0).items, 0).trim).toMatchObject({
            w: 126,
            h: 88,
        });
        expect(at(r.sheets, 0).label).toBe('Kans 1 t/m 4');
        expectSafe(r, 8);
    });

    it('puts the fold line in the middle of every card', () => {
        const sheet = at(foldCardSheets(4).sheets, 0);
        expect(sheet.foldLines).toHaveLength(4);
        sheet.items.forEach((it, i) => {
            expect(at(sheet.foldLines, i).x1).toBeCloseTo(it.trim.x + 63, 9);
            expect(at(sheet.foldLines, i).x2).toBeCloseTo(it.trim.x + 63, 9);
            expect(
                at(sheet.foldLines, i).y2 - at(sheet.foldLines, i).y1,
            ).toBeCloseTo(88, 9);
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
