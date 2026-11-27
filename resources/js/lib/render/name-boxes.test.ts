import { describe, expect, it } from 'vitest';

import {
    BOOKLET_COVER_BOX,
    BOOKLET_TITLE_BOX,
    NOTE_NAME_BOX,
    fitsNameBox,
} from './name-boxes';

describe('fitsNameBox', () => {
    it('fits a short name at the largest size of the box', () => {
        const result = fitsNameBox('Zaterdagclub', BOOKLET_COVER_BOX);

        expect(result.fits).toBe(true);
        expect(result.overflowChars).toBe(0);
        expect(result.fontSizeMm).toBeLessThanOrEqual(
            BOOKLET_COVER_BOX.maxFontMm,
        );
        expect(result.lines).toEqual(['Zaterdagclub']);
    });

    it('wraps and shrinks a longer name at spaces', () => {
        const name =
            'De grote zomereditie van de familie Jansen uit het mooie dorp aan zee';
        const result = fitsNameBox(name, BOOKLET_TITLE_BOX);

        expect(result.fits).toBe(true);
        expect(result.lines.length).toBeGreaterThan(1);
        expect(result.lines.join(' ')).toBe(name);
        expect(result.fontSizeMm).toBeLessThan(BOOKLET_TITLE_BOX.maxFontMm);
    });

    it('fails on a word too long for the note strip even at the smallest size', () => {
        const result = fitsNameBox('x'.repeat(80), NOTE_NAME_BOX);

        expect(result.fits).toBe(false);
        expect(result.overflowChars).toBeGreaterThan(0);
        expect(result.fontSizeMm).toBe(NOTE_NAME_BOX.minFontMm);
    });
});
