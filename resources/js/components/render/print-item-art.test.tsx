import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    cardBackKey,
    cardKey,
    deedKey,
    pawnKey,
    spaceKey,
} from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition, ElementOverride } from '@/lib/render/edition-types';
import type { PageItem, PrintSet } from '@/lib/render/print-composition';
import { allPartsOn } from '@/lib/render/print-edition';
import { BLEED } from '@/lib/render/print-page-frame';
import { defined } from '@/testing/defined';
import { makeEdition, photo } from '@/testing/edition-test-utils';

import { STICKER_BLEED } from './print-art-kit';
import {
    ElementArt,
    ItemArt,
    photoOf,
    type ArtContext,
} from './print-item-art';

const printed = { ...photo(), src: 'crop.jpg' };

const contextWith = (
    elements: Record<string, ElementOverride> = {},
    extra: { set?: PrintSet; measure?: boolean } = {},
): ArtContext => {
    const base = allPartsOn(makeEdition());
    const edition: Edition = {
        ...base,
        elements: { ...base.elements, ...elements },
    };

    return {
        edition,
        resolved: resolveEdition(edition),
        set: extra.set ?? 'printer',
        ...(extra.measure === undefined ? {} : { measure: extra.measure }),
    };
};

const item = (
    kind: PageItem['kind'],
    extra: Partial<PageItem> = {},
): PageItem => ({
    id: 'item',
    kind,
    elementKey: null,
    label: 'item',
    bleed: { x: 10, y: 20, w: 69, h: 94 },
    trim: { x: 13, y: 23, w: 63, h: 88 },
    ...extra,
});

describe('photoOf', () => {
    it('gives nothing for an element without a photo', () => {
        expect(photoOf(contextWith(), spaceKey(1))).toBeUndefined();
    });

    it('gives the crop the server made, without a transform', () => {
        expect(
            photoOf(
                contextWith({ [spaceKey(1)]: { photo: printed } }),
                spaceKey(1),
            ),
        ).toEqual({ src: 'crop.jpg' });
    });

    it('gives nothing when the server dropped the crop', () => {
        expect(
            photoOf(
                contextWith({ [spaceKey(1)]: { photo: photo() } }),
                spaceKey(1),
            ),
        ).toBeUndefined();
    });

    it('keeps the full style and the fit of the element photo', () => {
        const ctx = contextWith({
            [spaceKey(1)]: {
                photo: { ...printed, fit: true },
                photoStyle: 'full',
            },
        });

        expect(photoOf(ctx, spaceKey(1))).toEqual({
            src: 'crop.jpg',
            style: 'full',
            fit: true,
        });
    });

    it('never gives the background photo a style', () => {
        const ctx = contextWith({
            board_center: { background: printed, photoStyle: 'full' },
        });

        expect(photoOf(ctx, 'board_center', 'background')).toEqual({
            src: 'crop.jpg',
        });
    });

    it('gives a stand-in source when measuring, even without a crop', () => {
        const ctx = contextWith(
            { [spaceKey(1)]: { photo: photo(), photoStyle: 'full' } },
            { measure: true },
        );

        expect(photoOf(ctx, spaceKey(1))).toEqual({
            src: 'measure',
            style: 'full',
        });
    });
});

const carriesSetMark = (page: PageItem) =>
    render(<ItemArt ctx={contextWith()} item={page} />).container.querySelector(
        '[data-set-mark]',
    ) !== null;

describe('the set mark of an item', () => {
    it('marks nothing in a PDF with one set', () => {
        expect(carriesSetMark(item('note'))).toBe(false);
    });

    it('marks every banknote, every card back and both sides of a deed', () => {
        expect(carriesSetMark(item('note', { setNumber: 2 }))).toBe(true);
        expect(
            carriesSetMark(
                item('card', {
                    setNumber: 2,
                    side: 'back',
                    elementKey: cardKey('chance', 1),
                }),
            ),
        ).toBe(true);
        expect(
            carriesSetMark(
                item('card', {
                    setNumber: 2,
                    side: 'front',
                    elementKey: deedKey(1),
                }),
            ),
        ).toBe(true);
    });

    it('leaves the front of a Chance card and other items unmarked', () => {
        expect(
            carriesSetMark(
                item('card', {
                    setNumber: 2,
                    side: 'front',
                    elementKey: cardKey('chance', 1),
                }),
            ),
        ).toBe(false);
        expect(
            carriesSetMark(item('card', { setNumber: 2, side: 'front' })),
        ).toBe(false);
        expect(carriesSetMark(item('token', { setNumber: 2 }))).toBe(false);
    });
});

describe('ItemArt', () => {
    const draw = (page: PageItem, ctx = contextWith()) =>
        render(<ItemArt ctx={ctx} item={page} />).container;

    it('draws a card with its full bleed, placed in the item box', () => {
        const container = draw(
            item('card', { elementKey: cardKey('chance', 1), side: 'front' }),
        );
        const card = defined(
            container.querySelector<HTMLElement>(
                '[data-element="card-chance-front"]',
            ),
        );
        const holder = defined(card.parentElement);

        expect(card.dataset.bleedMm).toBe(String(BLEED));
        expect(holder.style.left).toBe('0mm');
        expect(holder.style.top).toBe('0mm');
    });

    it('draws no card without an element key or a side', () => {
        expect(draw(item('card', { side: 'front' })).innerHTML).toBe('');
        expect(
            draw(item('card', { elementKey: cardKey('chance', 1) })).innerHTML,
        ).toBe('');
    });

    it('draws nothing for the calibration item', () => {
        expect(draw(item('calibration')).innerHTML).toBe('');
    });

    it('draws the alignment page for its side', () => {
        expect(
            draw(item('alignment', { side: 'back' })).querySelector(
                '[data-alignment="back"]',
            ),
        ).not.toBeNull();
        expect(
            draw(item('alignment')).querySelector('[data-alignment="front"]'),
        ).not.toBeNull();
    });

    it('stamps the set mark on the bottom frame of a card back', () => {
        const mark = defined(
            draw(
                item('card', {
                    elementKey: cardKey('chance', 1),
                    side: 'back',
                    setNumber: 2,
                }),
            ).querySelector<HTMLElement>('[data-set-mark]'),
        );

        expect(mark.dataset.setMark).toBe('2');
        expect(mark.style.left).toBe(`${3 + 63 / 2}mm`);
        expect(mark.style.top).toBe(`${3 + 88 - 3}mm`);
    });

    it('stamps the set mark under the oval of a banknote', () => {
        const value = contextWith().resolved.money?.notes[0]?.value ?? 0;
        const mark = defined(
            draw(
                item('note', {
                    elementKey: `note.${String(value)}`,
                    setNumber: 3,
                }),
            ).querySelector<HTMLElement>('[data-set-mark]'),
        );

        expect(mark.dataset.setMark).toBe('3');
        expect(mark.style.left).toBe(`${3 + 56.8}mm`);
        expect(mark.style.top).toBe(`${3 + 60 - 4.6}mm`);
    });

    it('stamps no set mark on the front of a Chance card', () => {
        expect(
            draw(
                item('card', {
                    elementKey: cardKey('chance', 1),
                    side: 'front',
                    setNumber: 2,
                }),
            ).querySelector('[data-set-mark]'),
        ).toBeNull();
    });
});

describe('ElementArt', () => {
    const draw = (elementKey: string, ctx = contextWith()) =>
        render(<ElementArt ctx={ctx} elementKey={elementKey} />).container;
    const element = (container: HTMLElement) =>
        container.querySelector<HTMLElement>('[data-element]')?.dataset.element;

    it('draws the front of a card and of a deed', () => {
        expect(element(draw(cardKey('chest', 2)))).toBe('card-chest-front');
        expect(element(draw(deedKey(1)))).toBe('deed-street-front');
    });

    it('draws a card back with the first card of its deck', () => {
        expect(element(draw(cardBackKey('chance')))).toBe('card-chance-back');
        expect(draw(cardBackKey('deed')).innerHTML).toBe('');
    });

    it('draws a pawn', () => {
        expect(element(draw(pawnKey(1)))).toBe('pawn');
    });

    it('gives a space the sticker bleed at home and no bleed for the printer', () => {
        const bleed = (set: PrintSet) =>
            draw(
                spaceKey(1),
                contextWith({}, { set }),
            ).querySelector<HTMLElement>('[data-bleed-mm]')?.dataset.bleedMm;

        expect(bleed('home')).toBe(String(STICKER_BLEED));
        expect(bleed('printer')).toBe('0');
    });

    it('draws nothing for keys that are no element of their own', () => {
        expect(draw('group.brown').innerHTML).toBe('');
        expect(draw('theme_accent').innerHTML).toBe('');
        expect(draw('nonsense').innerHTML).toBe('');
    });

    it('draws the chosen icon preset of a special space', () => {
        const ctx = contextWith({
            [spaceKey(2)]: { icon: { preset: 'lucide:coins' } },
        });

        expect(
            draw(spaceKey(2), ctx).querySelector('[data-icon="lucide:coins"]'),
        ).not.toBeNull();
    });

    it('draws an uploaded icon from its crop, or a stand-in when measuring', () => {
        const icon = { icon: { photo: printed, aspect: 1 } };
        const src = (ctx: ArtContext) =>
            draw(spaceKey(2), ctx)
                .querySelector('[data-icon-photo] img')
                ?.getAttribute('src');

        expect(src(contextWith({ [spaceKey(2)]: icon }))).toBe('crop.jpg');
        expect(
            src(contextWith({ [spaceKey(2)]: icon }, { measure: true })),
        ).toBe('measure');
        expect(
            src(
                contextWith({
                    [spaceKey(2)]: { icon: { photo: photo(), aspect: 1 } },
                }),
            ),
        ).toBeUndefined();
    });

    it('draws the free layers of the box lid, a photo layer as a stand-in when measuring', () => {
        const ctx = contextWith(
            {
                box_lid: {
                    layers: [
                        {
                            id: 'words',
                            kind: 'text',
                            text: 'Van oma',
                            x: 5,
                            y: 5,
                            w: 30,
                            h: 8,
                        },
                        {
                            id: 'pic',
                            kind: 'photo',
                            photo: photo(),
                            x: 5,
                            y: 20,
                            w: 30,
                            h: 20,
                        },
                    ],
                },
            },
            { measure: true },
        );
        const container = draw('box_lid', ctx);

        expect(
            container.querySelector('[data-layer="words"]')?.textContent,
        ).toBe('Van oma');
        expect(
            container
                .querySelector('[data-layer="pic"] img')
                ?.getAttribute('src'),
        ).toBe('measure');
    });
});
