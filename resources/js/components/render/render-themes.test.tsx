import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE, spaceWidth } from '@/lib/render/print-board';
import { isOwnable, spaceAt } from '@/lib/render/standard-edition';
import { THEMES, type ThemeId } from '@/lib/render/themes';
import { css, root } from '@/testing/render-dom';
import type { OwnableSpace } from '@/types/game';
import { Board } from './board';
import { BoardSpace } from './board-space';
import { GameCard } from './game-card';
import { TitleDeed } from './title-deed';

const base = { theme: 'classic', locale: 'nl' } as const;

const ownableAt = (position: number): OwnableSpace => {
    const space = spaceAt(position);

    if (!isOwnable(space)) {
        throw new Error(`Space ${String(position)} has no deed`);
    }

    return space;
};

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
        const street = ownableAt(1);
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
                space={ownableAt(5)}
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
    const street = ownableAt(1);

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
