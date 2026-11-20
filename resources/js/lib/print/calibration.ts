import { spaceRects, type BoardProfile } from './board';
import { SHEET_PRESETS } from './imposition';
import { formatMm, type Rect, type Size } from './types';

/** ISO/IEC 7810 ID-1 bank card (B74). */
export const BANK_CARD: Size = { w: 85.6, h: 53.98 };
export const BANK_CARD_CORNER_RADIUS = 3.18;
export const RULER_LENGTH = 100;

export interface RulerTick {
    /** Distance from the ruler start in mm. */
    at: number;
    kind: 'mm' | 'five' | 'ten';
    /** Tick length in mm. */
    length: number;
}

export interface CalibrationSheet {
    page: Size;
    ruler: { x: number; y: number; length: number; ticks: RulerTick[] };
    bankCard: Rect & { radius: number };
    cornerSpace: Rect & { label: string };
    normalSpace: Rect & { label: string };
}

export function rulerTicks(length = RULER_LENGTH): RulerTick[] {
    const ticks: RulerTick[] = [];
    for (let at = 0; at <= length; at++) {
        const kind = at % 10 === 0 ? 'ten' : at % 5 === 0 ? 'five' : 'mm';
        ticks.push({ at, kind, length: kind === 'ten' ? 6 : kind === 'five' ? 4 : 2.5 });
    }
    return ticks;
}

/** Proof sheet on A4 portrait: ruler, bank card, one corner space and one normal space at true size. */
export function calibrationSheet(profile: BoardProfile): CalibrationSheet {
    const page = SHEET_PRESETS.A4;
    const [corner, normal] = spaceRects(profile);
    const m = 20;
    return {
        page,
        ruler: { x: m, y: 30, length: RULER_LENGTH, ticks: rulerTicks() },
        bankCard: { x: m, y: 50, ...BANK_CARD, radius: BANK_CARD_CORNER_RADIUS },
        cornerSpace: { x: m, y: 120, w: corner.w, h: corner.h, label: `Hoekvak ${formatMm(corner.w)} × ${formatMm(corner.h)} mm` },
        normalSpace: {
            x: m + corner.w + 15,
            y: 120,
            w: normal.w,
            h: normal.h,
            label: `Gewoon vak ${formatMm(normal.w)} × ${formatMm(normal.h)} mm`,
        },
    };
}
