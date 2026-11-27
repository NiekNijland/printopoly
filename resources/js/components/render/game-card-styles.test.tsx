import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { THEMES } from '@/lib/render/themes';

import {
    StyledArtPlate,
    StyledCardBack,
    StyledCardFront,
    cardPaper,
} from './game-card-styles';
import type { StyledFrontProps } from './game-card-styles-shared';

const MODERN: Pick<StyledFrontProps, 'style'> = { style: 'modern' };

const front: Omit<StyledFrontProps, 'style'> = {
    deck: 'chance',
    w: 63,
    h: 88,
    name: 'Kans',
    body: 'Ga naar start',
    amountText: '',
    lineHeight: 8,
    full: false,
    bleed: 0,
};

describe('the card styles', () => {
    it('prints each style on its own paper', () => {
        const theme = THEMES.classic;

        expect(cardPaper(theme, 'modern', 'chance', 'back')).toBe(
            theme.deckAccent.chance,
        );
        expect(cardPaper(theme, 'modern', 'chance', 'front')).toBe(theme.paper);
        expect(cardPaper(theme, 'playful', 'chest', 'front')).toBe(
            theme.deck.chest,
        );
        expect(cardPaper(theme, 'vintage', 'chest', 'front')).not.toBe(
            theme.deck.chest,
        );
    });

    it('draws the front of the chosen style', () => {
        const slot = (style: 'vintage' | 'modern' | 'playful', name: string) =>
            render(
                <StyledCardFront style={style} {...front} />,
            ).container.querySelector(`[data-slot="${name}"]`);

        expect(slot('vintage', 'engraved-border')).not.toBeNull();
        expect(slot('modern', 'block')).not.toBeNull();
        expect(slot('playful', 'block')).toBeNull();
    });

    it('draws the back and the art plate of the chosen style', () => {
        const back = render(
            <StyledCardBack
                {...MODERN}
                deck="chest"
                w={63}
                h={88}
                name="Fonds"
            />,
        ).container;
        const plate = render(
            <StyledArtPlate
                {...MODERN}
                deck="chest"
                w={63}
                h={88}
                name="Fonds"
                bleed={3}
            />,
        ).container;

        expect(back.querySelector('[data-slot="disc"]')).not.toBeNull();
        expect(plate.querySelector('[data-slot="plate"]')).not.toBeNull();
    });
});
