import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { spaceAt, standardEdition } from '@/lib/game/standard-edition';
import type { Card, OwnableSpace } from '@/lib/game/types';
import { DEFAULT_BOARD_PROFILE, spaceWidth } from '@/lib/print/board';
import { noteIcons, noteInk } from '@/lib/render/banknote-pattern';
import { mix } from '@/lib/render/color';
import { DEFAULT_WORDS } from '@/lib/render/rules-booklet';
import { THEMES, type ThemeId } from '@/lib/render/themes';

import { Banknote, BANKNOTE_SIZE_MM } from './banknote';
import { Board, BoardCenter, cardSpots } from './board';
import { BoardSpace } from './board-space';
import { BoxLid } from './box-lid';
import { DiceSheet } from './dice';
import { FitText } from './fit-text';
import { FoldSheet } from './fold-models';
import { GameCard } from './game-card';
import { HouseRulesCard, houseRuleLines } from './house-rules';
import { Invitation } from './invitation';
import { PAWN_SIZE_MM, PawnSheetItem } from './pawn';
import { PhotoSlot } from './photo-slot';
import { RulesBookletPage } from './rules-booklet';
import { Sheet } from './sheet';
import { TitleDeed } from './title-deed';

const base = { theme: 'classic', locale: 'nl' } as const;

/** The outer element of what was just rendered. */
function root(container: HTMLElement): HTMLElement {
    const element = container.firstElementChild;

    if (!(element instanceof HTMLElement)) {
        throw new Error('Nothing rendered');
    }

    return element;
}

/** How the browser normalises a colour, so tests can compare with what is in the style. */
function css(color: string): string {
    const probe = document.createElement('div');

    probe.style.background = color;

    return probe.style.background;
}

const mmSize = (element: HTMLElement) => [
    element.style.width,
    element.style.height,
];

describe('sizes in mm', () => {
    it('draws a space as wide as the board profile says and as deep as the corner', () => {
        const { container } = render(
            <BoardSpace {...base} space={spaceAt(1)} />,
        );

        expect(mmSize(root(container))).toEqual([
            `${spaceWidth(DEFAULT_BOARD_PROFILE)}mm`,
            '70mm',
        ]);
    });

    it('draws a corner as a square', () => {
        const { container } = render(
            <BoardSpace {...base} space={spaceAt(0)} />,
        );

        expect(mmSize(root(container))).toEqual(['70mm', '70mm']);
    });

    it('draws cards and deeds at 63 x 88 mm', () => {
        const card = render(
            <GameCard
                {...base}
                deck="chance"
                side="front"
                card={standardEdition.decks.chance[0]}
            />,
        );
        const deed = render(
            <TitleDeed
                {...base}
                space={spaceAt(1) as OwnableSpace}
                side="front"
            />,
        );

        expect(mmSize(root(card.container))).toEqual(['63mm', '88mm']);
        expect(mmSize(root(deed.container))).toEqual(['63mm', '88mm']);
    });

    it('puts the currency sign before the amounts in a standard card text', () => {
        const card = standardEdition.decks.chance[0] as Card;
        const euro = render(
            <GameCard {...base} deck="chance" side="front" card={card} />,
        );
        const play = render(
            <GameCard
                theme="classic"
                locale="en"
                currency="play"
                deck="chance"
                side="front"
                card={card}
            />,
        );

        expect(euro.container.textContent).toContain('€\u00A0200');
        expect(play.container.textContent).toMatch(/M\s?200/);
    });

    it('draws a banknote at 130 x 60 mm', () => {
        const { container } = render(<Banknote {...base} value={100} />);

        expect(BANKNOTE_SIZE_MM).toEqual({ w: 130, h: 60 });
        expect(mmSize(root(container))).toEqual(['130mm', '60mm']);
    });

    it('draws a pawn at 40 x 55 mm and the lid at the size of the board profile', () => {
        const pawn = render(<PawnSheetItem {...base} name="Pieter" />);
        const lid = render(<BoxLid {...base} editionName="Zaterdagclub" />);

        expect(PAWN_SIZE_MM).toEqual({ w: 40, h: 55 });
        expect(mmSize(root(pawn.container))).toEqual(['40mm', '55mm']);
        expect(mmSize(root(lid.container))).toEqual([
            `${DEFAULT_BOARD_PROFILE.boxLid.w}mm`,
            `${DEFAULT_BOARD_PROFILE.boxLid.h}mm`,
        ]);
    });

    it('draws the board at its outer size, with 40 spaces', () => {
        const { container } = render(
            <Board {...base} editionName="Zaterdagclub" />,
        );

        expect(mmSize(root(container))).toEqual(['500mm', '500mm']);
        expect(container.querySelectorAll('[data-position]')).toHaveLength(40);
    });

    it('draws the edition title per theme, with a tagline that can be switched off (B125)', () => {
        for (const theme of ['classic', 'riso', 'strak'] as const) {
            const { container } = render(
                <BoardCenter {...base} theme={theme} editionName="Club" />,
            );

            expect(
                container.querySelector('[data-slot="edition-plate"]'),
            ).not.toBeNull();
            expect(
                container.querySelector('[data-slot="edition-tagline"]')
                    ?.textContent,
            ).toBe('Het handelsspel');
        }

        const { container } = render(
            <BoardCenter
                {...base}
                editionName="Club"
                title={{ subtitle: '' }}
            />,
        );

        expect(
            container.querySelector('[data-slot="edition-tagline"]'),
        ).toBeNull();
    });

    it('puts the photo above the plate and keeps its shape, and a logo replaces the name (B125)', () => {
        const photo = { src: 'x.png' };
        const withPhoto = render(
            <BoardCenter
                {...base}
                editionName="Club"
                title={{ mode: 'photo', photo, photoAspect: 2 }}
            />,
        );
        const slot = withPhoto.container.querySelector<HTMLElement>(
            '[data-photo="filled"]',
        );

        expect(
            slot && Number(slot.dataset['w']) / Number(slot.dataset['h']),
        ).toBeCloseTo(2);
        expect(
            withPhoto.container.querySelector('[data-slot="edition-plate"]'),
        ).not.toBeNull();

        const logo = render(
            <BoardCenter
                {...base}
                editionName="Club"
                title={{
                    mode: 'logo',
                    photo,
                    photoAspect: 3,
                    photoRotation: 90,
                }}
            />,
        );
        const logoSlot = logo.container.querySelector<HTMLElement>(
            '[data-photo="filled"]',
        );

        expect(
            logo.container.querySelector('[data-slot="edition-plate"]'),
        ).toBeNull();
        expect(
            logoSlot &&
                Number(logoSlot.dataset['w']) / Number(logoSlot.dataset['h']),
        ).toBeCloseTo(1 / 3);
    });

    it('puts a photo over the whole centre, with dotted card spots on it (B125)', () => {
        const { container } = render(
            <BoardCenter
                {...base}
                editionName="Club"
                title={{ background: { src: 'bg.jpg' } }}
            />,
        );
        const bg = container.querySelector<HTMLElement>(
            '[data-background="filled"]',
        );

        expect([bg?.dataset['w'], bg?.dataset['h']]).toEqual(['360', '360']);
        expect(
            container.querySelectorAll('[data-slot="spot-plate"]'),
        ).toHaveLength(2);
        // The title photo frame stays the only `data-photo`.
        expect(container.querySelector('[data-photo]')).toBeNull();
        expect(
            container.querySelector('[data-slot="edition-plate"]'),
        ).not.toBeNull();
    });

    it('falls back to the name when a photo or logo is chosen but missing (B125)', () => {
        const { container } = render(
            <BoardCenter
                {...base}
                editionName="Club"
                title={{ mode: 'logo' }}
            />,
        );

        expect(
            container.querySelector('[data-slot="edition-plate"]'),
        ).not.toBeNull();
    });

    it('sizes the centre from the profile and gives the card spots the card size (B57)', () => {
        const { container } = render(
            <BoardCenter {...base} editionName="Zaterdagclub" />,
        );

        expect(mmSize(root(container))).toEqual(['360mm', '360mm']);

        for (const deck of ['chance', 'chest']) {
            const spot = container.querySelector<HTMLElement>(
                `[data-slot="card-spot-${deck}"]`,
            );

            expect(spot && mmSize(spot)).toEqual(['63mm', '88mm']);
        }

        expect(cardSpots()).toHaveLength(2);
    });
});

describe('bleed', () => {
    it('adds bleed on every side and keeps the content at the same place in the trim box', () => {
        const flat = render(<GameCard {...base} deck="chest" side="back" />);
        const bled = render(
            <GameCard {...base} deck="chest" side="back" bleedMm={3} />,
        );
        const outer = root(bled.container);
        const trim = outer.querySelector<HTMLElement>('[data-trim]');

        expect(mmSize(outer)).toEqual(['69mm', '94mm']);
        expect(outer.dataset.bleedMm).toBe('3');
        expect(trim?.style.left).toBe('3mm');
        expect(trim?.style.top).toBe('3mm');
        expect(mmSize(trim as HTMLElement)).toEqual(['63mm', '88mm']);
        expect(root(flat.container).dataset.bleedMm).toBe('0');
    });

    it('rounds the corners of a card only without bleed, because the printer cuts them', () => {
        const flat = render(<GameCard {...base} deck="chance" side="back" />);
        const bled = render(
            <GameCard {...base} deck="chance" side="back" bleedMm={3} />,
        );

        expect(root(flat.container).style.borderRadius).toBe('3mm');
        expect(root(bled.container).style.borderRadius).toBe('0mm');
    });

    it('has no bleed on money unless asked for', () => {
        const { container } = render(<Banknote {...base} value={20} />);

        expect(root(container).dataset.bleedMm).toBe('0');
        expect(mmSize(root(container))).toEqual(['130mm', '60mm']);
    });
});

describe('themes', () => {
    it.each<ThemeId>(['classic', 'riso', 'strak'])(
        'paints the board space of %s in the colours of the theme',
        (theme) => {
            const { container } = render(
                <BoardSpace theme={theme} locale="nl" space={spaceAt(1)} />,
            );

            expect(root(container).dataset.theme).toBe(theme);
            expect(root(container).style.background).toBe(
                css(THEMES[theme].boardBackground),
            );
        },
    );

    it('colours Chance and Community Chest cards per theme (B89)', () => {
        const classic = render(
            <GameCard {...base} deck="chance" side="back" />,
        );
        const chest = render(<GameCard {...base} deck="chest" side="back" />);
        const strak = render(
            <GameCard theme="strak" locale="nl" deck="chance" side="back" />,
        );

        expect(root(classic.container).style.background).toBe(css('#CCEDF9'));
        expect(root(chest.container).style.background).toBe(css('#FACCE5'));
        expect(root(strak.container).style.background).toBe(css('#F1F1EE'));
    });

    it('switches the heading font with the theme', () => {
        const classic = render(<BoardSpace {...base} space={spaceAt(1)} />);
        const strak = render(
            <BoardSpace theme="strak" locale="nl" space={spaceAt(1)} />,
        );
        const nameOf = (container: HTMLElement) =>
            container.querySelector<HTMLElement>('[data-slot="name"] > div')
                ?.style.fontFamily;

        expect(nameOf(classic.container)).toContain('League Spartan');
        expect(nameOf(strak.container)).not.toContain('League Spartan');
    });

    it('shows a photo in a frame in every theme and nothing without one', () => {
        for (const theme of ['classic', 'riso', 'strak'] as const) {
            const withPhoto = render(
                <BoardSpace
                    theme={theme}
                    locale="nl"
                    space={spaceAt(1)}
                    photo={{ src: 'a.jpg' }}
                />,
            );
            const without = render(
                <BoardSpace theme={theme} locale="nl" space={spaceAt(1)} />,
            );
            const photo = withPhoto.container.querySelector<HTMLElement>(
                '[data-photo="filled"]',
            );

            expect(photo?.style.width).not.toBe(
                `${spaceWidth(DEFAULT_BOARD_PROFILE)}mm`,
            );
            expect(
                without.container.querySelector('[data-photo="filled"]'),
            ).toBeNull();
        }
    });
});

describe('town of a colour group', () => {
    const townOf = (container: HTMLElement) =>
        container.querySelector('[data-slot="town"]')?.textContent;

    it('shows nothing by default and a small line above the street name when set', () => {
        for (const theme of ['classic', 'riso', 'strak'] as const) {
            const none = render(
                <BoardSpace theme={theme} locale="nl" space={spaceAt(1)} />,
            );
            const set = render(
                <BoardSpace
                    theme={theme}
                    locale="nl"
                    space={spaceAt(1)}
                    town="Zwolle"
                />,
            );

            expect(townOf(none.container)).toBeUndefined();
            expect(townOf(set.container)).toBe('Zwolle');
            expect(
                within(set.container).getByText('Molenweg'),
            ).toBeInTheDocument();
        }
    });

    it('is left out on spaces that are not streets and when empty', () => {
        const station = render(
            <BoardSpace {...base} space={spaceAt(5)} town="Zwolle" />,
        );
        const empty = render(
            <BoardSpace {...base} space={spaceAt(1)} town="  " />,
        );

        expect(townOf(station.container)).toBeUndefined();
        expect(townOf(empty.container)).toBeUndefined();
    });

    it('is on the board', () => {
        const { container } = render(
            <Board
                {...base}
                editionName="Test"
                spaces={{ 1: { town: 'Zwolle' } }}
            />,
        );

        expect(container.querySelectorAll('[data-slot="town"]')).toHaveLength(
            1,
        );
    });

    it('is on the front and the back of a deed, and only on streets', () => {
        const street = spaceAt(1) as OwnableSpace;
        const front = render(
            <TitleDeed {...base} space={street} side="front" town="Zwolle" />,
        );
        const back = render(
            <TitleDeed {...base} space={street} side="back" town="Zwolle" />,
        );
        const none = render(
            <TitleDeed {...base} space={street} side="front" />,
        );
        const station = render(
            <TitleDeed
                {...base}
                space={spaceAt(5) as OwnableSpace}
                side="front"
                town="Zwolle"
            />,
        );

        expect(townOf(front.container)).toBe('Zwolle');
        expect(townOf(back.container)).toBe('Zwolle');
        expect(townOf(none.container)).toBeUndefined();
        expect(townOf(station.container)).toBeUndefined();
    });
});

describe('title deeds in the themes', () => {
    const street = spaceAt(1) as OwnableSpace;

    it('takes the colours of the theme: no black frame and the inks of Riso on both sides', () => {
        for (const side of ['front', 'back'] as const) {
            const { container } = render(
                <TitleDeed
                    theme="riso"
                    locale="nl"
                    space={street}
                    side={side}
                />,
            );

            expect(root(container).style.background).toBe(
                css(THEMES.riso.deedPaper),
            );
            const band =
                container.querySelector<HTMLElement>('[data-slot="band"]');

            expect(band?.style.background).toBe(
                css(THEMES.riso.groupColors?.brown ?? ''),
            );
            expect(THEMES.riso.deedFrameMm).toBeLessThan(
                THEMES.classic.deedFrameMm,
            );
            expect(THEMES.riso.deedFrame).not.toBe(THEMES.riso.ink);
        }
    });

    it('keeps the label on the back, with the mortgage value in its own box', () => {
        const { container } = render(
            <TitleDeed {...base} space={street} side="back" />,
        );

        expect(
            container.querySelector('[data-slot="label"]'),
        ).toHaveTextContent('EIGENDOMSBEWIJS');
        expect(
            container.querySelector('[data-slot="mortgage-label"]'),
        ).toHaveTextContent('HYPOTHEEKWAARDE');
        expect(
            container.querySelector('[data-slot="mortgage"]'),
        ).not.toBeNull();
    });
});

describe('elements without a photo', () => {
    it('draw no empty photo box', () => {
        const elements = [
            <BoardSpace key="s" {...base} space={spaceAt(1)} />,
            <BoardSpace key="st" {...base} space={spaceAt(5)} />,
            <BoardSpace key="c" {...base} space={spaceAt(20)} />,
            <TitleDeed
                key="d"
                {...base}
                space={spaceAt(1) as OwnableSpace}
                side="front"
            />,
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

        expect(word.closest('[style*="color"]')?.getAttribute('style')).toContain(
            css(THEMES.classic.ink),
        );
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
    const card: Card = standardEdition.decks.chance[0] as Card;

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
        const withAmount = standardEdition.decks.chance.find((candidate) =>
            /(?<![\w.,])\d+(?!\w)/.test(
                candidate.text.nl.replace(/\{[^}]*\}/g, ''),
            ),
        ) as Card;
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

describe('title deed', () => {
    it('follows the original (B133): label and name in capitals in the block, no price and no copyright', () => {
        const { container } = render(
            <TitleDeed
                {...base}
                space={spaceAt(1) as OwnableSpace}
                side="front"
            />,
        );

        expect(
            container.querySelector('[data-slot="label"]'),
        ).toHaveTextContent('EIGENDOMSBEWIJS');
        expect(container.querySelector('[data-slot="name"]')?.textContent).toBe(
            (spaceAt(1) as OwnableSpace).name.nl.toUpperCase(),
        );
        expect(
            container.querySelector<HTMLElement>('[data-slot="band"]')?.style
                .border,
        ).toContain('0.25mm');
        expect(container.querySelector('[data-slot="price"]')).toBeNull();
        expect(container.textContent).not.toMatch(/Hasbro|©/);
    });

    it('labels the deed in English', () => {
        const { container } = render(
            <TitleDeed
                theme="classic"
                locale="en"
                space={spaceAt(1) as OwnableSpace}
                side="front"
            />,
        );
        const rows = Array.from(
            container.querySelectorAll('[data-slot="costs"] [data-row]'),
        ).map((row) => row.textContent);

        expect(
            container.querySelector('[data-slot="label"]'),
        ).toHaveTextContent('TITLE DEED');
        expect(rows).toEqual(['Houses cost£50 each', 'Hotels cost£50 each']);
        expect(
            container.querySelector('[data-slot="costs-note"]'),
        ).toHaveTextContent('(plus 4 houses)');
    });

    it('lets the rent table use the space of a missing photo strip', () => {
        const top = (withPhoto: boolean) => {
            const { container } = render(
                <TitleDeed
                    {...base}
                    space={spaceAt(1) as OwnableSpace}
                    side="front"
                    photo={withPhoto ? { src: 'a.jpg' } : undefined}
                />,
            );
            const table = container.querySelector<HTMLElement>(
                '[data-slot="rent-table"]',
            );

            return parseFloat(table?.style.top ?? '0');
        };

        // The table sits in the middle of what is left, so without the strip it starts higher.
        expect(top(false)).toBeLessThan(top(true));
    });

    it('shows the rent table of the game data', () => {
        const { container } = render(
            <TitleDeed
                {...base}
                space={spaceAt(1) as OwnableSpace}
                side="front"
            />,
        );
        const table = container.querySelector<HTMLElement>(
            '[data-slot="rent-table"]',
        );
        const rows = Array.from(
            table?.querySelectorAll('[data-row]') ?? [],
        ).map((row) => row.textContent);

        expect(rows).toEqual([
            'Huur€\u00A02',
            'Huur met kleurgroep€\u00A04',
            'Huur met 1 huis€\u00A010',
            'Huur met 2 huizen€\u00A030',
            'Huur met 3 huizen€\u00A090',
            'Huur met 4 huizen€\u00A0160',
            'Huur met hotel€\u00A0250',
        ]);
        expect(
            Array.from(
                container.querySelectorAll('[data-slot="costs"] [data-row]'),
            ).map((row) => row.textContent),
        ).toEqual([
            'Kosten huis€\u00A050 per stuk',
            'Kosten hotel€\u00A050 per stuk',
        ]);
        expect(screen.getByText('(plus 4 huizen)')).toBeInTheDocument();
    });

    it('shows four rows for a station and none for a utility', () => {
        const station = render(
            <TitleDeed
                {...base}
                space={spaceAt(5) as OwnableSpace}
                side="front"
            />,
        );
        const utility = render(
            <TitleDeed
                {...base}
                space={spaceAt(12) as OwnableSpace}
                side="front"
            />,
        );

        expect(station.container.querySelectorAll('[data-row]')).toHaveLength(
            4,
        );
        expect(utility.container.querySelectorAll('[data-row]')).toHaveLength(
            0,
        );
    });

    it('shows the mortgage on the back', () => {
        const { container } = render(
            <TitleDeed
                {...base}
                space={spaceAt(1) as OwnableSpace}
                side="back"
            />,
        );

        expect(
            container.querySelector('[data-slot="mortgage"]'),
        ).toHaveTextContent('€ 30');
        expect(screen.getByText(/Aflossen kost € 33/)).toBeInTheDocument();
    });

    it('uses the group colour for the band', () => {
        const { container } = render(
            <TitleDeed
                {...base}
                space={spaceAt(39) as OwnableSpace}
                side="front"
            />,
        );

        expect(
            container.querySelector<HTMLElement>('[data-slot="band"]')?.style
                .background,
        ).toBe(css('#0072BB'));
    });
});

describe('banknote', () => {
    it('always carries the word speelgeld, or play money in English', () => {
        const nl = render(<Banknote {...base} value={100} />);
        const en = render(<Banknote theme="classic" locale="en" value={100} />);

        const edition = render(
            <Banknote {...base} value={100} editionName="Zaterdagclub" />,
        );

        expect(
            within(nl.container).getAllByText('Speelgeld').length,
        ).toBeGreaterThan(0);
        expect(
            within(en.container).getAllByText('Play money').length,
        ).toBeGreaterThan(0);
        expect(
            within(edition.container).getByText('speelgeld'),
        ).toBeInTheDocument();
    });

    it('takes the note colour from the game data unless the edition picks another', () => {
        const standard = render(<Banknote {...base} value={100} />);
        const custom = render(
            <Banknote {...base} value={100} color="#EBD7F0" />,
        );

        expect(root(standard.container).style.background).toBe(css('#D3E4F5'));
        expect(root(custom.container).style.background).toBe(css('#EBD7F0'));
    });

    it('draws its own double frame and shows the bank name', () => {
        const { container } = render(
            <Banknote
                {...base}
                value={50}
                bankName="Bank van de Zaterdagclub"
            />,
        );

        expect(container.querySelectorAll('[data-frame]')).toHaveLength(2);
        expect(
            screen.getByText('Bank van de Zaterdagclub'),
        ).toBeInTheDocument();
        expect(screen.getByText('€ 50')).toBeInTheDocument();
    });

    it('follows the original note: oval, two value boxes, two icons and a strip (B137)', () => {
        const { container } = render(
            <Banknote
                {...base}
                value={500}
                editionName="Zaterdagclub"
                bankName="Bank van de club"
            />,
        );
        const slotText = (name: string) =>
            [...container.querySelectorAll(`[data-slot="${name}"]`)].map(
                (node) => node.textContent,
            );

        expect(container.querySelector('[data-oval]')).not.toBeNull();
        expect(slotText('value')).toEqual(['€\u00A0500']);
        expect(slotText('bank-name')).toEqual(['Bank van de club']);
        expect(slotText('corner-value')).toEqual(['500', '500']);
        expect(container.querySelectorAll('[data-note-icon]')).toHaveLength(2);
        expect(slotText('edition-name')).toEqual(['Zaterdagclub']);
        expect(slotText('play-money')).toEqual(['speelgeld']);
        expect(container.textContent).not.toMatch(/hasbro|monopoly|©/i);
    });

    it('draws a guilloche in a dark shade of the paper, lighter in Strak', () => {
        const classic = render(<Banknote {...base} value={100} />);
        const strak = render(
            <Banknote theme="strak" locale="nl" value={100} />,
        );
        const rings = (container: HTMLElement) =>
            container.querySelector('[data-pattern="rings"]');

        expect(
            rings(classic.container)?.getAttribute('d')?.length,
        ).toBeGreaterThan(
            (rings(strak.container)?.getAttribute('d')?.length ?? 0) * 1.5,
        );
        expect(
            classic.container.querySelector('[data-pattern="rosette"]'),
        ).not.toBeNull();
        expect(
            strak.container.querySelector('[data-pattern="rosette"]'),
        ).toBeNull();
        // A lighter tone of the ink, mixed with the paper rather than drawn with opacity.
        expect(rings(classic.container)?.getAttribute('stroke')).toBe(
            mix(noteInk('#D3E4F5', '#000000'), '#D3E4F5', 0.5),
        );
        expect(rings(classic.container)?.getAttribute('opacity')).toBeNull();
    });

    it('prints the pattern of a Riso note in the second ink, off register', () => {
        const { container } = render(
            <Banknote theme="riso" locale="nl" value={100} />,
        );
        const rings = container.querySelector('[data-pattern="rings"]');
        const layer = container.querySelector<HTMLElement>(
            '[data-slot="guilloche"]',
        );

        expect(rings?.getAttribute('stroke')).toBe(
            mix(THEMES.riso.accent, '#D3E4F5', 0.4),
        );
        expect(layer?.style.left).toBe('0.35mm');
    });

    it('gives every value its own pair of corner icons', () => {
        const pairs = [1, 5, 10, 20, 50, 100, 500].map((value) =>
            noteIcons(value).join('+'),
        );

        expect(new Set(pairs).size).toBeGreaterThan(1);
        expect(noteIcons(500)).toEqual(noteIcons(500));
    });
});

describe('PhotoSlot', () => {
    it('crops with pan, zoom, turn and black and white', () => {
        const { container } = render(
            <div>
                <PhotoSlot
                    x={0}
                    y={0}
                    w={40}
                    h={20}
                    photo={{
                        src: 'a.jpg',
                        width: 4000,
                        height: 3000,
                        transform: {
                            x: 0.5,
                            y: 0.5,
                            scale: 2,
                            rotation: 90,
                            grayscale: true,
                        },
                    }}
                />
            </div>,
        );
        const image = container.querySelector('img');

        expect(image?.style.transform).toBe('rotate(90deg)');
        expect(image?.style.filter).toBe('grayscale(1)');
        // Turned, the photo is 3000 x 4000 px: cover is 40 / 3000 mm/px, zoom 2 doubles it.
        expect(mmSize(image as HTMLElement)).toEqual(['106.667mm', '80mm']);
    });

    it('renders nothing without a photo', () => {
        const none = render(<PhotoSlot x={0} y={0} w={10} h={10} />);

        expect(none.container.firstElementChild).toBeNull();
    });
});

describe('FitText', () => {
    const slot = { x: 0, y: 0, w: 20, h: 5, maxFontMm: 4, minFontMm: 2 };

    function renderInSheet(ui: React.ReactNode) {
        return render(
            <Sheet
                {...base}
                element="test"
                widthMm={20}
                heightMm={5}
                background="#FFFFFF"
            >
                {ui}
            </Sheet>,
        );
    }

    it('keeps the maximum size for short text', () => {
        const { container } = renderInSheet(<FitText {...slot} text="Kans" />);

        expect(
            container.querySelector<HTMLElement>('[data-fits]')?.dataset
                .fontSizeMm,
        ).toBe('4');
    });

    it('shrinks long text and says when it does not fit even at the minimum size', () => {
        const onFit = vi.fn();
        const { container } = renderInSheet(
            <FitText {...slot} text={'tekst '.repeat(30)} onFit={onFit} />,
        );
        const box = container.querySelector<HTMLElement>('[data-fits]');

        expect(box?.dataset.fits).toBe('false');
        expect(box?.dataset.fontSizeMm).toBe('2');
        expect(Number(box?.dataset.overflowChars)).toBeGreaterThan(0);
        expect(onFit).toHaveBeenLastCalledWith(
            expect.objectContaining({ fits: false, fontSizeMm: 2 }),
        );
    });

    it('does not hyphenate', () => {
        const { container } = renderInSheet(
            <FitText
                {...slot}
                text="Hippopotomonstrosesquippedaliofobie"
                wrap="words"
            />,
        );

        expect(
            container.querySelector<HTMLElement>('[data-fits] > div')?.style
                .hyphens,
        ).toBe('none');
    });
});

describe('free layers, amounts and house rules', () => {
    const layers = [
        {
            id: 'a',
            kind: 'text',
            text: 'Hoi allemaal',
            x: 10,
            y: 20,
            w: 60,
            h: 12,
            rotation: -45,
        },
        { id: 'b', kind: 'photo', x: 80, y: 90, w: 30, h: 30 },
    ] as const;

    it('draws free layers on the centre, the lid and a card back, turned as asked', () => {
        const centre = render(
            <BoardCenter {...base} editionName="Club" layers={layers} />,
        );
        const layerA =
            centre.container.querySelector<HTMLElement>('[data-layer="a"]');
        expect(layerA?.style.left).toBe('10mm');
        expect(layerA?.style.transform).toBe('rotate(-45deg)');
        expect(
            centre.container.querySelector('[data-layer="b"]'),
        ).not.toBeNull();
        expect(screen.getAllByText('Hoi allemaal').length).toBeGreaterThan(0);

        const lid = render(
            <BoxLid {...base} editionName="Club" layers={layers} />,
        );
        expect(lid.container.querySelector('[data-layer="a"]')).not.toBeNull();

        const back = render(
            <GameCard {...base} deck="chance" side="back" layers={layers} />,
        );
        expect(back.container.querySelector('[data-layer="a"]')).not.toBeNull();
        const front = render(
            <GameCard {...base} deck="chance" side="front" layers={layers} />,
        );
        expect(front.container.querySelector('[data-layer]')).toBeNull();
    });

    it('runs the name along the diagonal of the board centre', () => {
        const { container } = render(
            <BoardCenter {...base} editionName="Club" />,
        );
        const diagonal = container.querySelector<HTMLElement>(
            '[data-slot="edition-name-diagonal"]',
        );
        expect(diagonal?.style.transform).toBe('rotate(-45deg)');
        expect(
            diagonal?.querySelector('[data-slot="edition-name"]'),
        ).not.toBeNull();
    });

    it('shows the amount of a card as receive or pay, and nothing for 0 or none', () => {
        const pay = render(
            <GameCard
                {...base}
                deck="chance"
                side="front"
                text="Boete"
                amount={-50}
            />,
        );
        expect(
            pay.container.querySelector('[data-slot="amount"]')?.textContent,
        ).toBe('Betaal €\u00A050');
        const get = render(
            <GameCard
                {...base}
                deck="chest"
                side="front"
                text="Taart"
                amount={20}
            />,
        );
        expect(
            get.container.querySelector('[data-slot="amount"]')?.textContent,
        ).toBe('Ontvang €\u00A020');
        const en = render(
            <GameCard
                theme="classic"
                locale="en"
                deck="chest"
                side="front"
                text="Cake"
                amount={20}
            />,
        );
        expect(
            en.container.querySelector('[data-slot="amount"]')?.textContent,
        ).toBe('Collect £20');
        for (const amount of [0, undefined]) {
            const none = render(
                <GameCard
                    {...base}
                    deck="chance"
                    side="front"
                    text="Niks"
                    amount={amount}
                />,
            );
            expect(
                none.container.querySelector('[data-slot="amount"]'),
            ).toBeNull();
        }
    });

    it('prints the house rules as one numbered card of 63 x 88 mm', () => {
        const { container } = render(
            <HouseRulesCard
                {...base}
                editionName="Club"
                text={'Geld onder Vrij parkeren\n\n  Geen handel in de cel '}
            />,
        );
        const sheet = root(container);
        expect(mmSize(sheet)).toEqual(['63mm', '88mm']);
        expect(sheet.dataset['element']).toBe('house-rules');
        expect(container.querySelector('[data-slot="text"]')?.textContent).toBe(
            '1. Geld onder Vrij parkeren\n2. Geen handel in de cel',
        );
        expect(
            container.querySelector('[data-slot="title"]')?.textContent,
        ).toBe('Huisregels');
        expect(houseRuleLines('a\n\n b ')).toEqual(['a', 'b']);
    });

    it('prints the bank name and the colour of a note', () => {
        const { container } = render(
            <Banknote
                {...base}
                value={20}
                color="#112233"
                bankName="Bank van de club"
            />,
        );
        expect(
            container.querySelector('[data-slot="bank-name"]')?.textContent,
        ).toBe('Bank van de club');
        expect(root(container).style.background).toBe(css('#112233'));
    });
});

describe('style of an edition (B130)', () => {
    const colors = { groupColors: { brown: '#123456', darkblue: '#654321' } };

    it('colours a street bar and a deed band with the group colour of the edition', () => {
        const space = render(
            <BoardSpace {...base} style={colors} space={spaceAt(1)} />,
        );
        const deed = render(
            <TitleDeed
                {...base}
                style={colors}
                space={spaceAt(1) as OwnableSpace}
                side="front"
            />,
        );

        expect(
            space.container.querySelector<HTMLElement>(
                '[data-slot="color-bar"]',
            )?.style.background,
        ).toBe(css('#123456'));
        expect(
            deed.container.querySelector<HTMLElement>('[data-slot="band"]')
                ?.style.background,
        ).toBe(css('#123456'));
    });

    it('looks exactly like the theme without a style', () => {
        const plain = render(<BoardSpace {...base} space={spaceAt(1)} />);
        const styled = render(
            <BoardSpace {...base} style={{}} space={spaceAt(1)} />,
        );

        expect(styled.container.innerHTML).toBe(plain.container.innerHTML);
    });

    it('draws the arrows of the Start corner in the accent colour', () => {
        const { container } = render(
            <BoardSpace
                {...base}
                style={{ accent: '#E6007E' }}
                space={spaceAt(0)}
            />,
        );

        expect(container.innerHTML).toContain(css('#E6007E'));
        expect(container.innerHTML).toContain('#E6007E');
    });

    it('fills a card back with a pattern or a photo over the whole card with bleed (B56)', () => {
        const pattern = render(
            <GameCard
                {...base}
                bleedMm={3}
                deck="chance"
                side="back"
                pattern="waves"
                edition="Club"
            />,
        );
        const photo = render(
            <GameCard
                {...base}
                bleedMm={3}
                deck="chest"
                side="back"
                photo={{ src: 'x.jpg' }}
                edition="Club"
            />,
        );

        expect(
            pattern.container.querySelector('[data-pattern="waves"]'),
        ).not.toBeNull();
        const slot = photo.container.querySelector('[data-photo="filled"]');

        expect(slot?.getAttribute('data-w')).toBe('69');
        expect(slot?.getAttribute('data-h')).toBe('94');
        // The deck is still named, on a plate, so the two backs stay apart.
        expect(
            photo.container.querySelector('[data-slot="title"]')?.textContent,
        ).toContain('Algemeen Fonds');
    });
});

describe('extra print items (B129)', () => {
    const base = { theme: 'classic', locale: 'nl' } as const;

    it('draws an A6 invitation with the text, and lines to fill in when it is empty', () => {
        const { container, rerender } = render(
            <Invitation
                {...base}
                text="Zaterdag 6 december"
                editionName="Club"
            />,
        );
        const sheet = container.querySelector('[data-element="invitation"]');

        expect(sheet?.getAttribute('data-width-mm')).toBe('105');
        expect(sheet?.getAttribute('data-height-mm')).toBe('148');
        expect(container.textContent).toContain('Zaterdag 6 december');

        rerender(<Invitation {...base} text="" editionName="Club" />);
        expect(container.textContent).toContain('Wanneer');
    });

    it('draws a booklet page with the prices of the edition', () => {
        const context = {
            locale: 'nl',
            currency: 'eur',
            name: 'Club',
            words: DEFAULT_WORDS.nl,
            spaceNames: standardEdition.spaces.map((s) => s.name.nl),
            houseRules: ['Geen deals'],
        } as const;
        const { container } = render(
            <RulesBookletPage {...base} page={12} context={context} />,
        );

        expect(container.textContent).toContain('Prijs');
        expect(container.textContent).toContain('Molenweg');
    });

    it('puts the photo of the fold models and the dice on every piece', () => {
        const photo = { src: 'x.jpg' };
        const models = render(
            <FoldSheet
                {...base}
                kind="house"
                number={1}
                sheets={2}
                count={3}
                photo={photo}
            />,
        );
        const dice = render(
            <DiceSheet {...base} editionName="Club" photo={photo} />,
        );

        expect(
            models.container.querySelectorAll('[data-photo="filled"]'),
        ).toHaveLength(3);
        expect(
            dice.container.querySelectorAll('[data-photo="filled"]'),
        ).toHaveLength(12);
    });
});
