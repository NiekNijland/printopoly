import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import {
    isOwnable,
    spaceAt,
    standardEdition,
} from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import { defined } from '@/testing/defined';
import { css } from '@/testing/render-dom';
import type { Card, OwnableSpace } from '@/types/game';
import { Banknote } from './banknote';
import { BoardSpace } from './board-space';
import { BoxLid } from './box-lid';
import { GameCard } from './game-card';
import { HouseRulesCard } from './house-rules';
import { PawnSheetItem } from './pawn';
import { TitleDeed } from './title-deed';

const base = { theme: 'classic', locale: 'nl' } as const;

const ownableAt = (position: number): OwnableSpace => {
    const space = spaceAt(position);

    if (!isOwnable(space)) {
        throw new Error(`Space ${String(position)} has no deed`);
    }

    return space;
};

describe('elements without a photo', () => {
    it('draw no empty photo box', () => {
        const elements = [
            <BoardSpace key="s" {...base} space={spaceAt(1)} />,
            <BoardSpace key="st" {...base} space={spaceAt(5)} />,
            <BoardSpace key="c" {...base} space={spaceAt(20)} />,
            <TitleDeed key="d" {...base} space={ownableAt(1)} side="front" />,
            <GameCard
                key="g"
                {...base}
                deck="chance"
                side="front"
                card={standardEdition.decks.chance[0]}
            />,
            <Banknote key="n" {...base} value={100} />,
            <BoxLid
                key="b"
                {...base}
                editionName="Test"
                profile={DEFAULT_BOARD_PROFILE}
            />,
            <PawnSheetItem key="p" {...base} name="Hoed" />,
            <HouseRulesCard
                key="h"
                {...base}
                text="Regels"
                editionName="Test"
            />,
        ];

        for (const element of elements) {
            const { container, unmount } = render(element);

            expect(container.querySelector('[data-photo]')).toBeNull();
            unmount();
        }
    });

    it('writes the word under a pawn in ink, not in the hairline colour (bug 31)', () => {
        const { container } = render(<PawnSheetItem {...base} name="Hoed" />);
        const word = within(container).getByText('Pion');

        expect(
            word.closest('[style*="color"]')?.getAttribute('style'),
        ).toContain(css(THEMES.classic.ink));
    });

    it('gives a pawn with and without a photo the same name size (R6 Tom, Sara)', () => {
        const nameOf = (container: HTMLElement) =>
            container.querySelector<HTMLElement>('[data-slot="name"]');
        const bare = render(<PawnSheetItem {...base} name="Priya" />);
        const withPhoto = render(
            <PawnSheetItem {...base} name="Priya" photo={{ src: 'o.jpg' }} />,
        );
        const bareName = nameOf(bare.container);
        const photoName = nameOf(withPhoto.container);

        expect(bareName?.getAttribute('style')).toBe(
            photoName?.getAttribute('style'),
        );
        expect(bareName?.dataset['fontSizeMm']).toBe(
            photoName?.dataset['fontSizeMm'],
        );
        // Where the photo would be, a pawn without one shows the first letter of its name.
        expect(
            bare.container.querySelector('[data-slot="initial-letter"]')
                ?.textContent,
        ).toBe('P');
        expect(
            withPhoto.container.querySelector('[data-slot="initial"]'),
        ).toBeNull();
    });

    it('puts the name of a pawn large in its panel', () => {
        const { container } = render(<PawnSheetItem {...base} name="Hoed" />);

        expect(within(container).getAllByText('Hoed').length).toBeGreaterThan(
            0,
        );
    });
});

describe('board spaces', () => {
    it('colours the bar of a street with its group colour', () => {
        const { container } = render(
            <BoardSpace {...base} space={spaceAt(1)} />,
        );
        const bar = container.querySelector<HTMLElement>(
            '[data-slot="color-bar"]',
        );

        expect(bar?.style.background).toBe(css('#955436'));
    });

    it('shows name and price in the edition language and currency', () => {
        const nl = render(<BoardSpace {...base} space={spaceAt(1)} />);
        const en = render(
            <BoardSpace theme="classic" locale="en" space={spaceAt(1)} />,
        );

        expect(within(nl.container).getByText('Molenweg')).toBeInTheDocument();
        expect(within(nl.container).getByText('€ 60')).toBeInTheDocument();
        expect(within(en.container).getByText('Mill Lane')).toBeInTheDocument();
        expect(within(en.container).getByText('£60')).toBeInTheDocument();
    });

    it('uses the edition name of a space instead of the standard one', () => {
        render(
            <BoardSpace {...base} space={spaceAt(1)} name="Jans Bierkelder" />,
        );

        expect(screen.getByText('Jans Bierkelder')).toBeInTheDocument();
    });

    it('shows the salary on Start and the tax amount on a tax space', () => {
        render(<BoardSpace {...base} space={spaceAt(0)} />);
        render(<BoardSpace {...base} space={spaceAt(4)} />);

        expect(
            screen.getByText('Ontvang € 200 als je langs Start komt'),
        ).toBeInTheDocument();
        expect(screen.getByText('Betaal € 200')).toBeInTheDocument();
    });

    it('names a renamed Start in the line on the corner', () => {
        render(<BoardSpace {...base} space={spaceAt(0)} name="Dorpsplein" />);

        expect(
            screen.getByText('Ontvang € 200 als je langs Dorpsplein komt'),
        ).toBeInTheDocument();
    });

    it('shows custom amounts and a chosen icon on the same space (B132, B136)', () => {
        const tax = spaceAt(4);
        if (tax.type !== 'tax') {
            throw new Error('space 4 is a tax space');
        }
        const plain = render(<BoardSpace {...base} space={tax} />);
        const both = render(
            <BoardSpace
                {...base}
                space={{ ...tax, amount: 240 }}
                icon={{ preset: 'piggy-bank' }}
            />,
        );

        expect(
            within(both.container).getByText('Betaal € 240'),
        ).toBeInTheDocument();
        expect(both.container.innerHTML).not.toBe(plain.container.innerHTML);
    });
});

describe('cards', () => {
    const card: Card = defined(standardEdition.decks.chance[0]);

    it('shows the text of the card on the front and the deck name on the back', () => {
        render(<GameCard {...base} deck="chance" side="front" card={card} />);
        render(<GameCard {...base} deck="chest" side="back" />);

        // The variables of the standard text are filled with the standard names (B131), the amounts get the sign.
        expect(
            screen.getByText(
                'Draai om en loop recht naar Start. Je krijgt € 200 van de bank.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('Algemeen Fonds')).toBeInTheDocument();
    });

    it('puts the currency sign before the amounts of a bare standard card (thumbnails, B132)', () => {
        const withAmount = defined(
            standardEdition.decks.chance.find((candidate) =>
                /(?<![\w.,])\d+(?!\w)/.test(
                    candidate.text.nl.replace(/\{[^}]*\}/g, ''),
                ),
            ),
        );
        const amounts = (text: string) =>
            [...text.replace(/\{[^}]*\}/g, '').matchAll(/\d+/g)].map(
                (match) => match[0],
            );
        const { container } = render(
            <GameCard {...base} deck="chance" side="front" card={withAmount} />,
        );
        const en = render(
            <GameCard
                theme="classic"
                locale="en"
                currency="play"
                deck="chance"
                side="front"
                card={withAmount}
            />,
        );

        for (const digits of amounts(withAmount.text.nl)) {
            expect(container.textContent).toMatch(
                new RegExp(`€\\u00A0${digits}(?!\\d)`),
            );
        }
        expect(en.container.textContent).toMatch(/M\d/);
    });

    it('prefers the edition text over the standard text', () => {
        render(
            <GameCard
                {...base}
                deck="chance"
                side="front"
                card={card}
                text="Pieters fiets staat op slot."
            />,
        );

        expect(
            screen.getByText('Pieters fiets staat op slot.'),
        ).toBeInTheDocument();
        expect(screen.queryByText(card.text.nl)).not.toBeInTheDocument();
    });
});
