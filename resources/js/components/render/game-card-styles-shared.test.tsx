import { describe, expect, it } from 'vitest';

import { THEMES } from '@/lib/render/themes';

import {
    V_BAND,
    V_INSET,
    confettiColors,
    deckIcon,
    hasText,
    vintageInks,
} from './game-card-styles-shared';

describe('what the card styles share', () => {
    it('shows dice on Chance and a chest on Community Chest', () => {
        expect(deckIcon('chance')).toBe('dice');
        expect(deckIcon('chest')).toBe('chest');
    });

    it('counts only text that is more than spaces', () => {
        expect(hasText(undefined)).toBe(false);
        expect(hasText('   ')).toBe(false);
        expect(hasText('Zaterdagclub')).toBe(true);
    });

    it('throws confetti in the deck accent, the second accent and the ink', () => {
        const theme = THEMES.classic;

        expect(confettiColors(theme, 'chance')).toEqual([
            theme.deckAccent.chance,
            theme.secondaryAccent,
            theme.ink,
        ]);
    });

    it('engraves Vintage in the deck accent on a creamed paper', () => {
        const inks = vintageInks(THEMES.classic, 'chest');

        expect(inks.accent).toBe(THEMES.classic.deckAccent.chest);
        expect(inks.paper).not.toBe(THEMES.classic.deck.chest);
        expect(inks.plate).not.toBe(inks.paper);
        expect([V_INSET, V_BAND]).toEqual([2.4, 2]);
    });
});
