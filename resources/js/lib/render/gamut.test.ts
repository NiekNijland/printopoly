import { describe, expect, it } from 'vitest';

import { standardEdition } from '@/lib/game/standard-edition';

import { contrastRatio, isOutOfGamut, bestTextOn, toPrintSafe } from './gamut';
import { PALETTES } from './palettes';
import { THEME_IDS } from './themes';

describe('print range of a colour (B75)', () => {
    it('lets every standard group colour and every palette colour through', () => {
        for (const group of standardEdition.groups) {
            expect(isOutOfGamut(group.color)).toBe(false);
        }
        for (const id of THEME_IDS) {
            for (const swatch of PALETTES[id]) {
                expect(isOutOfGamut(swatch.hex)).toBe(false);
            }
        }
    });

    it('flags neon greens, cyans, blues and violets but not reds and yellows', () => {
        expect(isOutOfGamut('#00FF00')).toBe(true);
        expect(isOutOfGamut('#00FFFF')).toBe(true);
        expect(isOutOfGamut('#0000FF')).toBe(true);
        expect(isOutOfGamut('#8000FF')).toBe(true);
        expect(isOutOfGamut('#FF0000')).toBe(false);
        expect(isOutOfGamut('#FFFF00')).toBe(false);
        expect(isOutOfGamut('#FF8800')).toBe(false);
    });

    it('tones a neon colour down into the range and leaves others alone', () => {
        for (const neon of ['#00FF00', '#00FFFF', '#0000FF', '#8000FF']) {
            const safe = toPrintSafe(neon);

            expect(isOutOfGamut(safe)).toBe(false);
            expect(safe).not.toBe(neon);
        }
        expect(toPrintSafe('#955436')).toBe('#955436');
        expect(toPrintSafe('#ff0000')).toBe('#FF0000');
    });
});

describe('contrast', () => {
    it('gives 21 for black on white and 1 for the same colour', () => {
        expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
        expect(contrastRatio('#808080', '#808080')).toBe(1);
    });

    it('picks the stronger of ink and white on any colour, so text stays above 4 to 1', () => {
        expect(bestTextOn('#1B1F24')).toBe('#FFFFFF');
        expect(bestTextOn('#FEF200')).toBe('#1B1F24');
        for (const hex of ['#787878', '#1FB25A', '#ED1B24', '#A7A7A7']) {
            expect(contrastRatio(bestTextOn(hex), hex)).toBeGreaterThanOrEqual(
                4,
            );
        }
    });
});
