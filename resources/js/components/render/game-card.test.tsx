import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CardStyle } from '@/lib/render/edition-part-styles';
import { THEMES } from '@/lib/render/themes';
import { css, root } from '@/testing/render-dom';
import type { Card } from '@/types/game';

import { CARD_SIZE_MM, GameCard, type GameCardProps } from './game-card';
import { cardPaper } from './game-card-styles';

const theme = THEMES.classic;

const prize: Card = {
    id: 'chest.90',
    effect: { nl: 'Ontvang', en: 'Receive' },
    text: { nl: 'Je wint een taartwedstrijd.', en: 'You win a cake contest.' },
    amount: 10,
};

const birthday: Card = {
    id: 'chest.91',
    effect: { nl: 'Ontvang', en: 'Receive' },
    text: {
        nl: 'Je bent jarig! Elke speler geeft je {currency} {amount}.',
        en: 'It is your birthday! Every player gives you {currency}{amount}.',
    },
    amount: 25,
};

const fine: Card = {
    id: 'chest.92',
    effect: { nl: 'Betaal', en: 'Pay' },
    text: { nl: 'Betaal 15 voor je parkeren.', en: 'Pay 15 for parking.' },
};

const card = (
    props: Partial<GameCardProps> & { cardStyle?: CardStyle } = {},
) => {
    const { cardStyle, ...rest } = props;

    return render(
        <GameCard
            theme="classic"
            locale="nl"
            deck="chest"
            side="front"
            {...(cardStyle === undefined
                ? {}
                : { style: { parts: { cards: cardStyle } } })}
            {...rest}
        />,
    ).container;
};

const text = (container: HTMLElement, slot: string) =>
    container.querySelector(`[data-slot="${slot}"]`)?.textContent ?? null;

describe('GameCard', () => {
    it('names the sheet after the deck and the side, at card size', () => {
        const sheet = root(card({ deck: 'chance', side: 'back' }));

        expect(sheet.dataset.element).toBe('card-chance-back');
        expect(sheet.dataset.widthMm).toBe(String(CARD_SIZE_MM.width));
        expect(sheet.dataset.heightMm).toBe(String(CARD_SIZE_MM.height));
    });

    it('takes the name of the deck from the title, the words, or the standard name', () => {
        expect(text(card({ title: 'Pot' }), 'title')).toBe('Pot');
        expect(
            text(card({ words: { decks: { chest: 'Spaarpot' } } }), 'title'),
        ).toBe('Spaarpot');
        expect(text(card({ deck: 'chance' }), 'title')).toBe('Kans');
        expect(text(card({ deck: 'chance', locale: 'en' }), 'title')).toBe(
            'Chance',
        );
    });

    it('prints the text of a standard card in the language, with its amount line', () => {
        const nl = card({ card: prize });

        expect(text(nl, 'text')).toBe('Je wint een taartwedstrijd.');
        expect(text(nl, 'amount')).toContain('10');
        expect(text(card({ card: prize, locale: 'en' }), 'text')).toBe(
            'You win a cake contest.',
        );
    });

    it('fills the amount into the text and drops the amount line when the text holds it', () => {
        const container = card({ card: birthday });

        expect(text(container, 'text')).toContain('25');
        expect(text(container, 'text')).not.toContain('{amount}');
        expect(text(container, 'amount')).toBeNull();
    });

    it('puts the currency sign before an amount in a standard text', () => {
        expect(text(card({ card: fine }), 'text')).toMatch(/€\s?15/);
    });

    it('prints the own text instead of the card text, without the card amount', () => {
        const container = card({ card: prize, text: 'Een eigen kaart.' });

        expect(text(container, 'text')).toBe('Een eigen kaart.');
        expect(text(container, 'amount')).toBeNull();
    });

    it('prints an own amount with its purpose', () => {
        const container = card({
            text: 'Taalcursus',
            amount: -50,
            purpose: 'je taalcursus',
        });

        expect(text(container, 'amount')).toContain('je taalcursus');
        expect(text(container, 'amount')).toContain('50');
    });

    it('prints the name of the edition on the back', () => {
        expect(
            text(card({ side: 'back', edition: 'Zaterdagclub' }), 'edition'),
        ).toBe('Zaterdagclub');
    });

    it('draws the free layers on the back only', () => {
        const layers = [
            {
                id: 'tag',
                kind: 'text',
                text: 'Van oma',
                x: 5,
                y: 5,
                w: 30,
                h: 8,
            },
        ] as const;

        expect(
            card({ side: 'back', layers }).querySelector('[data-layer="tag"]'),
        ).not.toBeNull();
        expect(
            card({ side: 'front', layers }).querySelector('[data-layer="tag"]'),
        ).toBeNull();
    });
});

describe('GameCard paper', () => {
    const paper = (props: Partial<GameCardProps> & { cardStyle?: CardStyle }) =>
        root(card(props)).style.background;

    it('lays the card on the deck colour of the theme without a card style', () => {
        expect(paper({ deck: 'chance' })).toBe(css(theme.deck.chance));
    });

    it('lays a styled card on the paper of its style', () => {
        expect(paper({ cardStyle: 'vintage' })).toBe(
            css(cardPaper(theme, 'vintage', 'chest', 'front')),
        );
        expect(paper({ cardStyle: 'modern', side: 'back' })).toBe(
            css(theme.deckAccent.chest),
        );
    });

    it('keeps the deck colour behind a back with a photo or a pattern', () => {
        expect(
            paper({
                cardStyle: 'modern',
                side: 'back',
                photo: { src: 'a.jpg' },
            }),
        ).toBe(css(theme.deck.chest));
        expect(
            paper({ cardStyle: 'modern', side: 'back', pattern: 'dots' }),
        ).toBe(css(theme.deck.chest));
        expect(
            paper({
                cardStyle: 'modern',
                side: 'front',
                photo: { src: 'a.jpg' },
            }),
        ).toBe(css(theme.paper));
    });
});
