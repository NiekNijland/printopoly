import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { spaceAt, standardEdition } from '@/lib/game/standard-edition';
import type { Card, OwnableSpace } from '@/lib/game/types';
import { DEFAULT_BOARD_PROFILE, spaceWidth } from '@/lib/print/board';
import { THEMES, type ThemeId } from '@/lib/render/themes';

import { Banknote, BANKNOTE_SIZE_MM } from './banknote';
import { Board, BoardCenter, cardSpots } from './board';
import { BoardSpace } from './board-space';
import { BoxLid } from './box-lid';
import { FitText } from './fit-text';
import { GameCard } from './game-card';
import { HouseRulesCard, houseRuleLines } from './house-rules';
import { PAWN_SIZE_MM, PawnSheetItem } from './pawn';
import { PhotoSlot } from './photo-slot';
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
        expect(within(en.container).getByText('M60')).toBeInTheDocument();
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
});

describe('cards', () => {
    const card: Card = standardEdition.decks.chance[0] as Card;

    it('shows the text of the card on the front and the deck name on the back', () => {
        render(<GameCard {...base} deck="chance" side="front" card={card} />);
        render(<GameCard {...base} deck="chest" side="back" />);

        expect(screen.getByText(card.text.nl)).toBeInTheDocument();
        expect(screen.getByText('Algemeen Fonds')).toBeInTheDocument();
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
    it('lets the rent table use the space of a missing photo strip', () => {
        const top = (placeholder: boolean) => {
            const { container } = render(
                <TitleDeed
                    {...base}
                    space={spaceAt(1) as OwnableSpace}
                    side="front"
                    placeholder={placeholder}
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
            'Huur€ 2',
            'Hele kleur in bezit€ 4',
            'Met 1 huis€ 10',
            'Met 2 huizen€ 30',
            'Met 3 huizen€ 90',
            'Met 4 huizen€ 160',
            'Met hotel€ 250',
        ]);
        expect(
            screen.getByText('Huis € 50 · hotel € 50 plus 4 huizen'),
        ).toBeInTheDocument();
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

        expect(within(nl.container).getByText('speelgeld')).toBeInTheDocument();
        expect(
            within(en.container).getByText('play money'),
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

    it('renders nothing without a photo, unless a placeholder is asked for', () => {
        const none = render(<PhotoSlot x={0} y={0} w={10} h={10} />);
        const tint = render(
            <PhotoSlot x={0} y={0} w={10} h={10} placeholder="#CFC6B2" />,
        );

        expect(none.container.firstElementChild).toBeNull();
        expect(
            tint.container.querySelector('[data-photo="empty"]'),
        ).not.toBeNull();
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
        const name = container.querySelector('[data-slot="edition-name"]');
        expect(name?.parentElement?.style.transform).toBe('rotate(-45deg)');
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
        ).toBe('Betaal € 50');
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
        ).toBe('Ontvang € 20');
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
        ).toBe('Collect M20');
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
