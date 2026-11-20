import { describe, expect, it } from 'vitest';

import { luminance, readableOn } from './color';
import { THEME_IDS, THEMES } from './themes';

describe('themes', () => {
    it('has Klassiek, Riso and Strak', () => {
        expect(THEME_IDS).toEqual(['classic', 'riso', 'strak']);
        expect(THEMES.classic.name.nl).toBe('Klassiek');
        expect(THEMES.riso.name.nl).toBe('Riso');
        expect(THEMES.strak.name.nl).toBe('Strak');
    });

    it('uses the colours of B89 for Klassiek', () => {
        expect(THEMES.classic.boardBackground).toBe('#D4E9D7');
        expect(THEMES.classic.deck).toEqual({
            chance: '#CCEDF9',
            chest: '#FACCE5',
        });
    });

    it('defines every colour as a flat hex value, ready to convert to CMYK', () => {
        for (const theme of Object.values(THEMES)) {
            const colors = [
                theme.paper,
                theme.boardBackground,
                theme.cornerBackground,
                theme.ink,
                theme.accent,
                theme.secondaryAccent,
                ...Object.values(theme.deck),
                ...Object.values(theme.deckAccent),
            ];

            for (const color of colors) {
                expect(color).toMatch(/^#[0-9A-F]{6}$/);
            }
        }
    });
});

describe('readableOn', () => {
    it('picks ink on light colours and white on dark ones', () => {
        expect(readableOn('#FEF200')).toBe('#1B1F24');
        expect(readableOn('#AAE0FA')).toBe('#1B1F24');
        expect(readableOn('#955436')).toBe('#FFFFFF');
        expect(readableOn('#0072BB')).toBe('#FFFFFF');
        expect(luminance('#FFFFFF')).toBeCloseTo(1);
    });
});
