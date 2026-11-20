import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    deedsFor,
    spaceAt,
    standardEdition,
} from '@/lib/game/standard-edition';
import { DEFAULT_BOARD_PROFILE, spaceWidth } from '@/lib/print/board';
import type { PhotoSource } from '@/lib/render/photo';

import { Banknote, BANKNOTE_SIZE_MM } from './banknote';
import { BoardSpace } from './board-space';
import { BoxLid } from './box-lid';
import { GameCard } from './game-card';
import { PAWN_SIZE_MM, PawnSheetItem } from './pawn';
import { TitleDeed } from './title-deed';

const THEME_IDS = ['classic', 'riso', 'strak'] as const;
const full: PhotoSource = { src: 'a.jpg', style: 'full' };
const framed: PhotoSource = { src: 'a.jpg' };

/** The size in mm of the first photo slot, or null without one. */
function slot(container: HTMLElement) {
    const photo = container.querySelector<HTMLElement>('[data-photo="filled"]');

    return photo === null
        ? null
        : {
              w: Number(photo.dataset['w']),
              h: Number(photo.dataset['h']),
              left: photo.style.left,
              top: photo.style.top,
          };
}

const fullBleed = (w: number, h: number, bleed: number) => ({
    w: w + 2 * bleed,
    h: h + 2 * bleed,
});

describe('full photo on a board space', () => {
    const width = spaceWidth(DEFAULT_BOARD_PROFILE);
    const depth = DEFAULT_BOARD_PROFILE.corner;

    it('fills the space below the colour bar, with the name on a band and the price on the photo', () => {
        for (const theme of THEME_IDS) {
            const { container } = render(
                <BoardSpace
                    theme={theme}
                    locale="nl"
                    space={spaceAt(1)}
                    photo={full}
                />,
            );
            const found = slot(container);
            const bar = depth * 0.2;

            expect(found).toMatchObject({ w: width, h: depth - bar });
            expect(
                container.querySelector('[data-slot="name-band"]'),
            ).not.toBeNull();
            expect(
                container.querySelector('[data-slot="scrim"]'),
            ).not.toBeNull();
            expect(
                container.querySelector('[data-slot="color-bar"]'),
            ).not.toBeNull();
            expect(
                container.querySelector('[data-slot="price"]')?.textContent,
            ).toBe('€ 60');
        }
    });

    it('keeps the framed layout for a framed photo and the text layout without a photo', () => {
        const framedSpace = render(
            <BoardSpace
                theme="classic"
                locale="nl"
                space={spaceAt(1)}
                photo={framed}
            />,
        );
        const text = render(
            <BoardSpace theme="classic" locale="nl" space={spaceAt(1)} />,
        );

        expect(slot(framedSpace.container)?.w).toBe(width - 4);
        expect(
            framedSpace.container.querySelector('[data-slot="name-band"]'),
        ).toBeNull();
        expect(text.container.querySelector('[data-photo]')).toBeNull();
    });

    it('runs the photo into the bleed of a home sticker, and also over the top for a station', () => {
        const street = render(
            <BoardSpace
                theme="classic"
                locale="nl"
                space={spaceAt(1)}
                photo={full}
                bleedMm={2.5}
            />,
        );
        const station = render(
            <BoardSpace
                theme="classic"
                locale="nl"
                space={spaceAt(5)}
                photo={full}
                bleedMm={2.5}
            />,
        );
        const bar = depth * 0.2;

        expect(slot(street.container)).toMatchObject({
            w: width + 5,
            h: depth - bar + 2.5,
        });
        expect(slot(station.container)).toMatchObject({
            ...fullBleed(width, depth, 2.5),
        });
    });

    it('leaves a corner on its framed photo', () => {
        const corner = render(
            <BoardSpace
                theme="classic"
                locale="nl"
                space={spaceAt(20)}
                photo={full}
            />,
        );

        expect(
            corner.container.querySelector('[data-slot="name-band"]'),
        ).toBeNull();
        expect(slot(corner.container)?.w).toBeLessThan(
            DEFAULT_BOARD_PROFILE.corner,
        );
    });
});

describe('full photo on a title deed', () => {
    const space = deedsFor()[0];

    it('puts the photo behind the title, bleed included, and keeps the rent table on paper', () => {
        if (space === undefined) {
            throw new Error('No deeds');
        }

        for (const theme of THEME_IDS) {
            const { container } = render(
                <TitleDeed
                    theme={theme}
                    locale="nl"
                    space={space}
                    side="front"
                    photo={full}
                    bleedMm={3}
                />,
            );

            expect(slot(container)).toMatchObject({ w: 69, h: 39 });
            expect(
                container.querySelectorAll('[data-row]').length,
            ).toBeGreaterThan(5);
            expect(
                container.querySelector('[data-slot="name"]')?.textContent,
            ).toBe(space.name.nl);
            // Every row of the table fits the paper under the photo.
            expect([
                ...container.querySelectorAll('[data-fits="false"]'),
            ]).toHaveLength(0);
        }
    });

    it('draws the same table with a framed photo', () => {
        if (space === undefined) {
            throw new Error('No deeds');
        }
        const { container } = render(
            <TitleDeed
                theme="classic"
                locale="nl"
                space={space}
                side="front"
                photo={framed}
            />,
        );

        expect(slot(container)).toMatchObject({ w: 57, h: 15.5 });
    });
});

describe('full photo on a card', () => {
    it('covers the card with the title on a band and the text on a panel', () => {
        const card = standardEdition.decks.chance[0];

        for (const theme of THEME_IDS) {
            const { container } = render(
                <GameCard
                    theme={theme}
                    locale="nl"
                    deck="chance"
                    side="front"
                    card={card}
                    photo={full}
                    bleedMm={3}
                />,
            );

            expect(slot(container)).toMatchObject({ w: 69, h: 94 });
            expect(
                container.querySelector('[data-slot="title-band"]'),
            ).not.toBeNull();
            expect(
                container.querySelector('[data-slot="text-panel"]'),
            ).not.toBeNull();
            expect([
                ...container.querySelectorAll('[data-fits="false"]'),
            ]).toHaveLength(0);
        }
    });

    it('keeps the framed card as it was', () => {
        const { container } = render(
            <GameCard
                theme="classic"
                locale="nl"
                deck="chance"
                side="front"
                card={standardEdition.decks.chance[0]}
                photo={framed}
                bleedMm={3}
            />,
        );

        expect(slot(container)).toMatchObject({ w: 54, h: 28 });
    });
});

describe('full photo on money, pawns and the box lid', () => {
    it('gives a note a much larger photo than the framed circle', () => {
        const circle = render(
            <Banknote theme="classic" locale="nl" value={100} photo={framed} />,
        );
        const large = render(
            <Banknote
                theme="classic"
                locale="nl"
                value={100}
                bankName="Bank"
                photo={full}
            />,
        );

        expect(slot(circle.container)).toMatchObject({ w: 24, h: 24 });
        expect(slot(large.container)).toMatchObject({
            w: BANKNOTE_SIZE_MM.w - 39,
            h: BANKNOTE_SIZE_MM.h,
        });
        expect(
            large.container.querySelector('[data-slot="bank-name"]')
                ?.textContent,
        ).toBe('Bank');
        expect(
            large.container.querySelector('[data-slot="amount"]'),
        ).not.toBeNull();
    });

    it('fills both faces of a pawn', () => {
        const { container } = render(
            <PawnSheetItem
                theme="classic"
                locale="nl"
                name="Hoed"
                photo={full}
            />,
        );
        const photos = [
            ...container.querySelectorAll<HTMLElement>('[data-photo="filled"]'),
        ];

        expect(photos).toHaveLength(2);
        expect(photos[0]?.dataset['w']).toBe(String(PAWN_SIZE_MM.w));
    });

    it('covers the lid including the bleed', () => {
        const { w, h } = DEFAULT_BOARD_PROFILE.boxLid;
        const { container } = render(
            <BoxLid
                theme="classic"
                locale="nl"
                editionName="Dalfsen"
                photo={full}
                bleedMm={3}
            />,
        );

        expect(slot(container)).toMatchObject(fullBleed(w, h, 3));
        expect(
            container.querySelector('[data-slot="edition-name"]')?.textContent,
        ).toBe('Dalfsen');
    });
});
