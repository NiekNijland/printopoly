import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { BoardStyle } from '@/lib/render/edition-part-styles';
import { THEME_IDS } from '@/lib/render/edition-types';
import type { PhotoSource } from '@/lib/render/photo';
import { spaceAt } from '@/lib/render/standard-edition';

import { Board } from './board';
import { wobblyRect } from './board-look-playful';
import { BoardSpace } from './board-space';

const STYLES: readonly (BoardStyle | undefined)[] = [
    undefined,
    'vintage',
    'modern',
    'playful',
];

const photo: PhotoSource = {
    src: 'data:image/png;base64,AAAA',
    width: 800,
    height: 600,
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0, grayscale: false },
};

const space = (position: number, style: BoardStyle | undefined, extra = {}) => {
    return render(
        <BoardSpace
            theme="classic"
            locale="nl"
            space={spaceAt(position)}
            {...(style === undefined
                ? {}
                : { style: { parts: { board: style } } })}
            {...extra}
        />,
    ).container;
};

describe('board styles (B268)', () => {
    it.each(
        THEME_IDS.flatMap((theme) => STYLES.map((s) => [theme, s] as const)),
    )(
        'draws every space of the %s board in style %s with its name and price slots',
        (theme, style) => {
            const { container } = render(
                <Board
                    theme={theme}
                    locale="nl"
                    editionName="Zaterdagclub"
                    {...(style === undefined
                        ? {}
                        : { style: { parts: { board: style } } })}
                />,
            );

            expect(container.querySelectorAll('[data-position]')).toHaveLength(
                40,
            );
            // Streets, stations and utilities keep their slots, so the checks find the same text.
            expect(
                container.querySelectorAll('[data-slot="price"]'),
            ).toHaveLength(28);
            expect(
                container.querySelectorAll('[data-slot="color-bar"]'),
            ).toHaveLength(style === 'modern' ? 28 : 22);
            expect(
                container.querySelectorAll('[data-slot="amount"]'),
            ).toHaveLength(2);
        },
    );

    it('draws the theme exactly as before without a style', () => {
        const plain = space(1, undefined);
        expect(plain.querySelector('[data-slot="vintage-rules"]')).toBeNull();
        expect(plain.querySelector('[data-slot="tile"]')).toBeNull();
        expect(plain.querySelector('[data-slot="cartouche"]')).toBeNull();
    });

    it('gives Vintage its double rule, a hatched band and a cartouche for the price', () => {
        const street = space(1, 'vintage');
        expect(
            street.querySelector('[data-slot="vintage-rules"]'),
        ).not.toBeNull();
        expect(street.querySelector('[data-slot="hatch"]')).not.toBeNull();
        expect(street.querySelector('[data-slot="cartouche"]')).not.toBeNull();
        // The corners get a diamond in each corner of the rule.
        expect(
            space(0, 'vintage').querySelectorAll(
                '[data-slot="vintage-rules"] path',
            ),
        ).toHaveLength(4);
    });

    it('gives Modern a colour block for every property and a quarter disc in the corners but the jail', () => {
        expect(
            space(5, 'modern').querySelector('[data-slot="color-bar"]'),
        ).not.toBeNull();
        expect(
            space(0, 'modern').querySelector('[data-slot="quarter"]'),
        ).not.toBeNull();
        expect(
            space(10, 'modern').querySelector('[data-slot="quarter"]'),
        ).toBeNull();
        expect(
            space(7, 'modern').querySelector('[data-slot="deck-disc"]'),
        ).not.toBeNull();
    });

    it('gives Speels a tile without the straight lines, an awning and confetti', () => {
        const street = space(1, 'playful');
        expect(street.querySelector('[data-slot="tile"]')).not.toBeNull();
        expect(street.querySelector('[data-frame]')).toBeNull();
        expect(
            street.querySelector('[data-slot="color-bar"] path'),
        ).not.toBeNull();
        expect(
            space(20, 'playful').querySelector('[data-slot="confetti"]'),
        ).not.toBeNull();
    });

    it.each(STYLES)(
        'keeps a framed photo and a photo over the whole space in style %s',
        (style) => {
            const framed = space(1, style, { photo });
            expect(
                framed.querySelectorAll('[data-photo="filled"]'),
            ).toHaveLength(1);
            const full = space(1, style, {
                photo: { ...photo, style: 'full' },
            });
            expect(full.querySelectorAll('[data-photo="filled"]')).toHaveLength(
                1,
            );
            expect(
                full.querySelector('[data-slot="name-band"]'),
            ).not.toBeNull();
        },
    );

    it('draws the hand-drawn edge the same way every time', () => {
        expect(wobblyRect(1, 1, 38, 68, 2.6, 7)).toBe(
            wobblyRect(1, 1, 38, 68, 2.6, 7),
        );
        expect(wobblyRect(1, 1, 38, 68, 2.6, 7)).not.toBe(
            wobblyRect(1, 1, 38, 68, 2.6, 8),
        );
    });
});
