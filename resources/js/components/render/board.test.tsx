import { render } from '@testing-library/react';

import { centerLayout } from '@/lib/render/center-layout';
import { resolveEdition } from '@/lib/render/edition-resolve';
import {
    DEFAULT_BOARD_PROFILE,
    spaceRects,
    type BoardProfile,
} from '@/lib/render/print-board';
import { spaceAt, standardEdition } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import { makeEdition, photo } from '@/testing/edition-test-utils';
import { css, root } from '@/testing/render-dom';

import {
    Board,
    BoardCenter,
    cardSpots,
    centerTitleOf,
    edgeSides,
    layoutOfTitle,
} from './board';
import { FRAME_INSET } from './edition-title';

const profile = DEFAULT_BOARD_PROFILE;
const bordered: BoardProfile = { ...profile, border: 10 };
const picture = { src: 'logo.png' };

const rectAt = (position: number, of: BoardProfile = profile) => {
    const rect = spaceRects(of).find((r) => r.position === position);

    if (rect === undefined) {
        throw new Error(`No rect at ${String(position)}`);
    }

    return rect;
};

const placed = (container: HTMLElement, position: number) => {
    const element = container.querySelector<HTMLElement>(
        `[data-position="${String(position)}"]`,
    );

    if (element === null) {
        throw new Error(`No space at ${String(position)}`);
    }

    return element;
};

describe('cardSpots', () => {
    it('puts Community Chest top left and Chance bottom right on the diagonal, at card size', () => {
        const { width, height } = standardEdition.components.cardSizeMm;
        const [chest, chance] = cardSpots(profile);

        expect(chest).toEqual({
            deck: 'chest',
            cx: 360 * 0.27,
            cy: 360 * 0.27,
            w: width,
            h: height,
            rotation: 45,
        });
        expect(chance?.deck).toBe('chance');
        expect(chance?.cx).toBeCloseTo(360 * 0.73);
        expect(chance?.cy).toBeCloseTo(360 * 0.73);
    });

    it('scales the spots with the centre of a smaller board', () => {
        const [chest] = cardSpots({ ...profile, outer: 400 });

        expect(chest?.cx).toBeCloseTo(260 * 0.27);
    });
});

describe('centerTitleOf', () => {
    it('takes the title options of a resolved centre and the given photos', () => {
        const centre = {
            ...resolveEdition(makeEdition()).boardCenter,
            mode: 'logo' as const,
            subtitle: '',
            photo: { ...photo(), rotation: 90 },
            photoAspect: 2,
            photoFrame: false,
            titleOffset: 0.5,
            titleScale: 0.7,
            titleHidden: true,
            place: 'middle' as const,
            logoTilt: true,
            titleStyle: 'stamp' as const,
        };
        const background = { src: 'bg.jpg' };

        expect(centerTitleOf(centre, picture, background)).toEqual({
            mode: 'logo',
            subtitle: '',
            photo: picture,
            photoAspect: 2,
            photoRotation: 90,
            photoFrame: false,
            background,
            offset: 0.5,
            scale: 0.7,
            hidden: true,
            place: 'middle',
            logoTilt: true,
            style: 'stamp',
        });
    });

    it('turns a centre without a photo into rotation 0', () => {
        const centre = resolveEdition(makeEdition()).boardCenter;

        expect(centerTitleOf(centre, undefined).photoRotation).toBe(0);
        expect(centerTitleOf(centre, undefined).background).toBeUndefined();
    });
});

describe('layoutOfTitle', () => {
    const base = {
        mode: 'name' as const,
        place: 'topRight' as const,
        scale: 1,
        offset: 0,
        aspect: 4 / 3,
        logoTilt: false,
        frameInset: FRAME_INSET,
    };

    it('lays out the name alone in the top right square by default', () => {
        expect(layoutOfTitle(profile, {})).toEqual(centerLayout(profile, base));
    });

    it('falls back to the name when a photo mode has no image', () => {
        expect(layoutOfTitle(profile, { mode: 'photo' })).toEqual(
            centerLayout(profile, base),
        );
    });

    it('turns the aspect of a photo placed a quarter turn', () => {
        expect(
            layoutOfTitle(profile, {
                mode: 'photo',
                photo: picture,
                photoAspect: 2,
                photoRotation: 90,
                photoFrame: false,
                place: 'middle',
                scale: 0.6,
                offset: -0.5,
            }),
        ).toEqual(
            centerLayout(profile, {
                ...base,
                mode: 'photo',
                aspect: 0.5,
                frameInset: 0,
                place: 'middle',
                scale: 0.6,
                offset: -0.5,
            }),
        );
    });

    it('gives a logo a wide default aspect and its tilt, also when told there is an image', () => {
        expect(
            layoutOfTitle(profile, { mode: 'logo', logoTilt: true }, true),
        ).toEqual(
            centerLayout(profile, {
                ...base,
                mode: 'logo',
                aspect: 3,
                logoTilt: true,
            }),
        );
    });
});

describe('edgeSides', () => {
    it('opens the outer two sides of a corner, turned with the corner', () => {
        expect(edgeSides(rectAt(0), profile)).toEqual(['right', 'bottom']);
        expect(edgeSides({ ...rectAt(20), rotation: 180 }, profile)).toEqual([
            'bottom',
            'right',
        ]);
    });

    it('maps the outer side of every row back to the upright bottom of its space', () => {
        for (const position of [1, 11, 21, 31]) {
            expect(edgeSides(rectAt(position), profile)).toEqual(['bottom']);
        }
    });

    it('opens nothing when the board has a border around the spaces', () => {
        expect(edgeSides(rectAt(0, bordered), bordered)).toEqual([]);
        expect(edgeSides(rectAt(5, bordered), bordered)).toEqual([]);
    });
});

describe('Board', () => {
    it('draws the whole board at its outer size with the centre and 40 spaces', () => {
        const { container } = render(
            <Board theme="riso" locale="nl" editionName="Zaterdagclub" />,
        );
        const sheet = root(container);

        expect(sheet.getAttribute('data-element')).toBe('board');
        expect(sheet.getAttribute('data-width-mm')).toBe('500');
        expect(sheet.style.background).toBe(css(THEMES.riso.boardBackground));
        expect(container.querySelectorAll('[data-position]')).toHaveLength(40);
        expect(
            container.querySelector('[data-slot="card-spot-chest"]'),
        ).not.toBeNull();
    });

    it('turns corners and side spaces to face the centre, swapping width and height on the sides', () => {
        const { container } = render(
            <Board theme="classic" locale="nl" editionName="Zaterdagclub" />,
        );

        expect(placed(container, 0).style.transform).toBe('rotate(0deg)');
        expect(placed(container, 10).style.transform).toBe('rotate(90deg)');
        expect(placed(container, 30).style.transform).toBe('rotate(270deg)');

        const side = placed(container, 11);
        const rect = rectAt(11);

        expect(side.style.transform).toBe('rotate(90deg)');
        expect(side.style.width).toBe(`${String(rect.h)}mm`);
        expect(side.style.height).toBe(`${String(rect.w)}mm`);
    });
});

describe('Board with own spaces', () => {
    it('draws the own name and the own space of a position', () => {
        const { container } = render(
            <Board
                theme="classic"
                locale="nl"
                editionName="Zaterdagclub"
                spaces={{
                    1: { name: 'Dorpsplein' },
                    3: {
                        space: {
                            ...spaceAt(3),
                            name: { nl: 'Kerkpad', en: 'Church Path' },
                        },
                    },
                }}
            />,
        );

        expect(
            placed(container, 1).querySelector('[data-slot="name"]')
                ?.textContent,
        ).toBe('Dorpsplein');
        expect(
            placed(container, 3).querySelector('[data-slot="name"]')
                ?.textContent,
        ).toBe('Kerkpad');
    });

    it('leaves the line off at the cut edge only when the spaces touch it', () => {
        const edge = render(
            <Board theme="classic" locale="nl" editionName="Zaterdagclub" />,
        ).container;
        const inside = render(
            <Board
                theme="classic"
                locale="nl"
                editionName="Zaterdagclub"
                profile={bordered}
            />,
        ).container;

        expect(
            placed(edge, 1).querySelectorAll('[data-frame] line'),
        ).toHaveLength(3);
        expect(placed(inside, 1).querySelector('[data-frame] line')).toBeNull();
        expect(
            placed(inside, 1).querySelector('[data-frame] rect'),
        ).not.toBeNull();
    });
});

describe('BoardCenter', () => {
    it('draws the centre alone at the size of the centre with both card spots', () => {
        const { container } = render(
            <BoardCenter
                theme="gala"
                locale="en"
                editionName="Saturday Club"
            />,
        );
        const sheet = root(container);

        expect(sheet.getAttribute('data-element')).toBe('board-center');
        expect(sheet.getAttribute('data-width-mm')).toBe('360');
        expect(sheet.getAttribute('data-height-mm')).toBe('360');
        expect(sheet.style.background).toBe(css(THEMES.gala.boardBackground));
        expect(
            container.querySelector('[data-slot="card-spot-chance"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="card-spot-chest"]'),
        ).not.toBeNull();
    });
});
