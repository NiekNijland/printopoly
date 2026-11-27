import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { BoardStyle } from '@/lib/render/edition-part-styles';
import { THEMES } from '@/lib/render/themes';
import { css } from '@/testing/render-dom';

import { StyledDeck, StyledTax } from './board-space-styles';
import { Sheet } from './sheet';

const theme = THEMES.classic;

const inBoard = (style: BoardStyle, children: ReactNode) => {
    return render(
        <Sheet
            element="space"
            theme="classic"
            locale="nl"
            widthMm={40}
            heightMm={70}
            background="#fff"
            style={{ parts: { board: style } }}
        >
            {children}
        </Sheet>,
    ).container;
};

const slot = (container: HTMLElement, name: string) =>
    container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

const inner = (container: HTMLElement, name: string) =>
    slot(container, name)?.querySelector<HTMLElement>('div');

const tax = (style: BoardStyle, icon?: { preset: 'rocket' }) =>
    inBoard(
        style,
        <StyledTax
            style={style}
            w={40}
            h={70}
            title="Inkomstenbelasting"
            amount="Betaal € 200"
            icon={icon}
        />,
    );

const deck = (
    style: BoardStyle,
    which: 'chance' | 'chest',
    icon?: { preset: 'rocket' },
) =>
    inBoard(
        style,
        <StyledDeck
            style={style}
            deck={which}
            w={40}
            h={70}
            title="Kans"
            icon={icon}
        />,
    );

describe('StyledTax', () => {
    it('puts the amount in paper on a full-width ink block in Modern', () => {
        const container = tax('modern');
        const block = slot(container, 'amount-block');

        expect(block?.style.background).toBe(css(theme.ink));
        expect(block?.style.left).toBe('0mm');
        expect(block?.style.width).toBe('40mm');
        expect(inner(container, 'amount')?.style.color).toBe(css(theme.paper));
        expect(inner(container, 'name')?.style.textAlign).toBe('left');
        expect(slot(container, 'cartouche')).toBeNull();
        expect(slot(container, 'pill')).toBeNull();
    });

    it('puts the amount in ink in a cartouche in Vintage, the name centred', () => {
        const container = tax('vintage');

        expect(slot(container, 'cartouche')).not.toBeNull();
        expect(slot(container, 'amount-block')).toBeNull();
        expect(inner(container, 'amount')?.style.color).toBe(css(theme.ink));
        expect(inner(container, 'name')?.style.textAlign).toBe('center');
        expect(inner(container, 'name')?.style.textTransform).toBe('uppercase');
    });

    it('puts the amount on a dashed pill in Speels', () => {
        const container = tax('playful');
        const pill = slot(container, 'pill')?.querySelector('rect');

        expect(pill?.getAttribute('stroke-dasharray')).toBe('1.1 0.8');
        expect(slot(container, 'cartouche')).toBeNull();
        expect(slot(container, 'amount-block')).toBeNull();
    });

    it('shows the name and the amount as given', () => {
        const container = tax('modern');

        expect(slot(container, 'name')?.textContent).toBe('Inkomstenbelasting');
        expect(slot(container, 'amount')?.textContent).toBe('Betaal € 200');
    });

    it('draws an icon only when the edition chose one', () => {
        expect(tax('vintage').querySelector('[data-icon]')).toBeNull();
        expect(
            tax('vintage', { preset: 'rocket' })
                .querySelector('[data-icon]')
                ?.getAttribute('data-icon'),
        ).toBe('rocket');
    });
});

describe('StyledDeck', () => {
    it('draws the sign of the deck on a disc in its accent in Modern', () => {
        const container = deck('modern', 'chance');
        const disc = slot(container, 'deck-disc')?.querySelector('circle');

        expect(disc?.getAttribute('fill')).toBe(theme.deckAccent.chance);
        expect(
            container.querySelector('[data-icon]')?.getAttribute('data-icon'),
        ).toBe('dice');
        expect(inner(container, 'name')?.style.textAlign).toBe('left');
        expect(container.querySelector('[data-frame]')).toBeNull();
    });

    it('frames a Speels space in the accent of its deck', () => {
        const container = deck('playful', 'chest');
        const frame = container.querySelector('[data-frame] rect');

        expect(frame?.getAttribute('stroke')).toBe(theme.deckAccent.chest);
        expect(frame?.getAttribute('stroke-width')).toBe('0.45');
        expect(slot(container, 'deck-disc')).toBeNull();
        expect(
            container.querySelector('[data-icon]')?.getAttribute('stroke'),
        ).toBe(theme.deckAccent.chest);
        expect(
            container.querySelector('[data-icon]')?.getAttribute('data-icon'),
        ).toBe('chest');
    });

    it('draws a Vintage space without a frame or disc, the name centred', () => {
        const container = deck('vintage', 'chance');

        expect(container.querySelector('[data-frame]')).toBeNull();
        expect(slot(container, 'deck-disc')).toBeNull();
        expect(inner(container, 'name')?.style.textAlign).toBe('center');
        expect(
            container
                .querySelector('[data-icon]')
                ?.getAttribute('stroke-width'),
        ).toBe('1.3');
    });

    it('draws the chosen icon instead of the sign of the deck', () => {
        const container = deck('modern', 'chance', { preset: 'rocket' });

        expect(
            container.querySelector('[data-icon]')?.getAttribute('data-icon'),
        ).toBe('rocket');
    });
});
