import { render } from '@testing-library/react';

import { mix } from '@/lib/render/color';
import type { BoardStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import { DEFAULT_BOARD_PROFILE, spaceWidth } from '@/lib/render/print-board';
import { spaceAt } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import { css, root } from '@/testing/render-dom';

import { CREAM } from './board-look';
import { BoardSpace, spaceSize, type BoardSpaceProps } from './board-space';

const theme = THEMES.classic;
const photo: PhotoSource = { src: 'a.jpg', width: 800, height: 600 };
const fullPhoto: PhotoSource = { ...photo, style: 'full' };

const draw = (
    position: number,
    style?: BoardStyle,
    extra: Partial<BoardSpaceProps> = {},
) => {
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

const slots = (container: HTMLElement, name: string) =>
    container.querySelectorAll(`[data-slot="${name}"]`);

describe('spaceSize', () => {
    it('makes a corner square and a side space as wide as a ninth of the side', () => {
        expect(spaceSize(spaceAt(0), DEFAULT_BOARD_PROFILE)).toEqual({
            w: 70,
            h: 70,
        });
        expect(spaceSize(spaceAt(1), DEFAULT_BOARD_PROFILE)).toEqual({
            w: spaceWidth(DEFAULT_BOARD_PROFILE),
            h: 70,
        });
    });
});

describe('BoardSpace', () => {
    it('names the sheet after the type of the space at its upright size', () => {
        const sheet = root(draw(1));

        expect(sheet.getAttribute('data-element')).toBe('space-street');
        expect(sheet.getAttribute('data-width-mm')).toBe(
            String(spaceWidth(DEFAULT_BOARD_PROFILE)),
        );
        expect(sheet.getAttribute('data-height-mm')).toBe('70');
        expect(root(draw(0)).getAttribute('data-element')).toBe('space-corner');
    });

    it('colours deck spaces, corners and the rest after the theme', () => {
        expect(root(draw(7)).style.background).toBe(css(theme.deck.chance));
        expect(root(draw(2)).style.background).toBe(css(theme.deck.chest));
        expect(root(draw(0)).style.background).toBe(
            css(theme.cornerBackground),
        );
        expect(root(draw(1)).style.background).toBe(css(theme.boardBackground));
    });

    it('warms the paper in Vintage and keeps the board colour under the Speels tile', () => {
        expect(root(draw(1, 'vintage')).style.background).toBe(
            css(mix(theme.boardBackground, CREAM, 0.75)),
        );
        expect(root(draw(1, 'modern')).style.background).toBe(css(theme.paper));
        expect(root(draw(7, 'playful')).style.background).toBe(
            css(theme.boardBackground),
        );
    });

    it('draws a closed line around the space by default and none when asked', () => {
        const framed = draw(1).querySelectorAll('[data-frame] rect');

        expect(framed).toHaveLength(1);
        expect(framed[0]?.getAttribute('stroke')).toBe(theme.line);
        expect(
            draw(1, undefined, { frame: false }).querySelector('[data-frame]'),
        ).toBeNull();
        expect(draw(1, 'playful').querySelector('[data-frame]')).toBeNull();
    });

    it('leaves out the line on the sides at the cut edge', () => {
        const container = draw(1, undefined, { openSides: ['bottom', 'left'] });
        const lines = container.querySelectorAll('[data-frame] line');
        const w = spaceWidth(DEFAULT_BOARD_PROFILE);

        expect(container.querySelector('[data-frame] rect')).toBeNull();
        expect(lines).toHaveLength(2);
        expect(lines[0]?.getAttribute('y1')).toBe('0.1');
        expect(lines[0]?.getAttribute('x2')).toBe(String(w));
        expect(lines[1]?.getAttribute('x1')).toBe(String(w - 0.1));
        expect(lines[1]?.getAttribute('y2')).toBe('70');
    });
});

describe('BoardSpace with a photo', () => {
    it('shows a framed photo on a street but none on a tax space', () => {
        expect(
            draw(1, undefined, { photo }).querySelectorAll('img'),
        ).toHaveLength(1);
        expect(draw(4, undefined, { photo }).querySelector('img')).toBeNull();
    });

    it('wraps a full photo of Speels in a second hand-drawn tile', () => {
        expect(slots(draw(1, 'playful'), 'tile')).toHaveLength(1);
        expect(
            slots(draw(1, 'playful', { photo: fullPhoto }), 'tile'),
        ).toHaveLength(2);
        expect(slots(draw(1, 'playful', { photo }), 'tile')).toHaveLength(1);
    });

    it('drops the Vintage rules under a full photo but keeps them on a corner', () => {
        expect(
            slots(draw(1, 'vintage', { photo: fullPhoto }), 'vintage-rules'),
        ).toHaveLength(0);
        expect(
            slots(draw(1, 'vintage', { photo }), 'vintage-rules'),
        ).toHaveLength(1);
        expect(
            slots(draw(0, 'vintage', { photo: fullPhoto }), 'vintage-rules'),
        ).toHaveLength(1);
    });

    it('uses the own name of the edition instead of the standard one', () => {
        expect(
            draw(1, undefined, { name: 'Dorpsplein' }).querySelector(
                '[data-slot="name"]',
            )?.textContent,
        ).toBe('Dorpsplein');
    });
});
