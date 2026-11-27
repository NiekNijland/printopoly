import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BANKNOTE_SIZE_MM } from '@/components/render/banknote-parts';
import { DEFAULT_BOARD_PROFILE, spaceWidth } from '@/lib/render/print-board';
import {
    isOwnable,
    spaceAt,
    standardEdition,
} from '@/lib/render/standard-edition';
import { defined } from '@/testing/defined';
import { mmSize, root } from '@/testing/render-dom';
import type { OwnableSpace } from '@/types/game';
import { Banknote } from './banknote';
import { Board, BoardCenter, cardSpots } from './board';
import { BoardSpace } from './board-space';
import { BoxLid } from './box-lid';
import { GameCard } from './game-card';
import { PAWN_SIZE_MM, PawnSheetItem } from './pawn';
import { TitleDeed } from './title-deed';

const base = { theme: 'classic', locale: 'nl' } as const;

const ownableAt = (position: number): OwnableSpace => {
    const space = spaceAt(position);

    if (!isOwnable(space)) {
        throw new Error(`Space ${String(position)} has no deed`);
    }

    return space;
};

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
            <TitleDeed {...base} space={ownableAt(1)} side="front" />,
        );

        expect(mmSize(root(card.container))).toEqual(['63mm', '88mm']);
        expect(mmSize(root(deed.container))).toEqual(['63mm', '88mm']);
    });

    it('puts the currency sign before the amounts in a standard card text', () => {
        const card = defined(standardEdition.decks.chance[0]);
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

    it('runs the photo over the whole centre into the bleed of a home sticker, not the board colour (R5-03)', () => {
        const { container } = render(
            <BoardCenter
                {...base}
                bleedMm={3}
                editionName="Club"
                title={{
                    background: { src: 'bg.jpg', width: 3000, height: 4000 },
                }}
            />,
        );
        const bg = container.querySelector<HTMLElement>(
            '[data-background="filled"]',
        );
        const img = bg?.querySelector('img');

        // The photo area reaches 3 mm past the centre on every side, and the photo covers all of it.
        expect([bg?.style.left, bg?.style.width]).toEqual(['-3mm', '366mm']);
        expect(parseFloat(img?.style.left ?? '1')).toBeLessThanOrEqual(0);
        expect(parseFloat(img?.style.top ?? '1')).toBeLessThanOrEqual(0);
        expect(
            parseFloat(img?.style.left ?? '0') +
                parseFloat(img?.style.width ?? '0'),
        ).toBeGreaterThanOrEqual(366);
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

        expect([bg?.dataset['w'], bg?.dataset['h']]).toEqual(['366', '366']);
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
        expect(mmSize(defined(trim))).toEqual(['63mm', '88mm']);
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
