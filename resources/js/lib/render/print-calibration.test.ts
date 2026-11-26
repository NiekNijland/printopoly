import { describe, expect, it } from 'vitest';
import { at } from '../../types/print';
import { DEFAULT_BOARD_PROFILE, spaceRects } from './print-board';
import { BANK_CARD, calibrationSheet, rulerTicks } from './print-calibration';

describe('calibrationSheet', () => {
    const sheet = calibrationSheet(DEFAULT_BOARD_PROFILE);

    it('has a 100 mm ruler with a tick per mm and emphasised 5 and 10 mm ticks', () => {
        const ticks = rulerTicks();
        expect(ticks).toHaveLength(101);
        expect(ticks.at(-1)!.at).toBe(100);
        expect(ticks.filter((t) => t.kind === 'ten')).toHaveLength(11);
        expect(ticks.filter((t) => t.kind === 'five')).toHaveLength(10);
        expect(sheet.ruler.length).toBe(100);
    });

    it('uses the ISO ID-1 bank card size', () => {
        expect(BANK_CARD).toEqual({ w: 85.6, h: 53.98 });
        expect(sheet.bankCard).toMatchObject({ w: 85.6, h: 53.98 });
    });

    it('shows a corner space and a normal space at the profile size', () => {
        const rects = spaceRects(DEFAULT_BOARD_PROFILE);
        expect(sheet.cornerSpace).toMatchObject({
            w: at(rects, 0).w,
            h: at(rects, 0).h,
        });
        expect(sheet.normalSpace).toMatchObject({
            w: at(rects, 1).w,
            h: at(rects, 1).h,
        });
        expect(sheet.cornerSpace.label).toBe('Hoekvak 70 × 70 mm');
        expect(sheet.normalSpace.label).toBe('Gewoon vak 40 × 70 mm');
    });

    it('fits everything on the A4 page', () => {
        for (const r of [
            sheet.bankCard,
            sheet.cornerSpace,
            sheet.normalSpace,
        ]) {
            expect(r.x + r.w).toBeLessThanOrEqual(sheet.page.w - 8);
            expect(r.y + r.h).toBeLessThanOrEqual(sheet.page.h - 8);
        }
        expect(sheet.ruler.x + sheet.ruler.length).toBeLessThanOrEqual(
            sheet.page.w - 8,
        );
    });
});
