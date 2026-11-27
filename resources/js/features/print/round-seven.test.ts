import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { ItemArt, type ArtContext } from '@/components/render/print-item-art';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { PageItem } from '@/lib/render/print-composition';
import { makeEdition } from '@/testing/edition-test-utils';

import {
    composePages,
    type PrintEdition,
} from '../../lib/render/print-composition';
import { BLEED } from '../../lib/render/print-page-frame';
import { describeEstimate, partQuantity, setEstimate } from './estimate';
import { pageLabel } from './labels';

const edition: PrintEdition = { elements: {} };

const art: ArtContext = {
    edition: makeEdition(),
    resolved: resolveEdition(makeEdition()),
    set: 'printer',
};

const carriesSetMark = (item: PageItem): boolean => {
    const { container, unmount } = render(
        createElement(ItemArt, { ctx: art, item }),
    );
    const marked = container.querySelector('[data-set-mark]') !== null;
    unmount();

    return marked;
};

/** Set marks (B242), the whole board (B243) and invitations by number (B244). */
describe('more sets in one PDF', () => {
    it('repeats the sheets of cards for every set after one alignment test', () => {
        const one = composePages('cards', 'home', edition);
        const three = composePages('cards', 'home', { ...edition, sets: 3 });

        expect(three).toHaveLength(2 + 3 * (one.length - 2));
        expect(three[0]?.items[0]?.setNumber).toBeUndefined();
        expect(three[2]?.items[0]?.setNumber).toBe(1);
        expect(three.at(-1)?.items[0]?.setNumber).toBe(3);
        expect(three.at(-1)?.label).toMatch(/· SET 3$/);
        // One set has no marks at all.
        expect(
            one.every((page) =>
                page.items.every((item) => item.setNumber === undefined),
            ),
        ).toBe(true);
    });

    it('marks the backs, the deeds and the notes, not the fronts of the decks', () => {
        const pages = composePages('cards', 'printer', { ...edition, sets: 2 });
        const marked = pages
            .flatMap((page) => page.items)
            .filter(carriesSetMark);
        const items = pages.flatMap((page) => page.items);

        expect(pages).toHaveLength(
            2 * composePages('cards', 'printer', edition).length,
        );
        expect(
            marked.every(
                (item) =>
                    item.side === 'back' ||
                    (item.elementKey ?? '').startsWith('deed.'),
            ),
        ).toBe(true);
        expect(
            items.some(
                (item) =>
                    item.side === 'front' &&
                    (item.elementKey ?? '').startsWith('card.') &&
                    carriesSetMark(item),
            ),
        ).toBe(false);

        const money = composePages('money', 'home', { ...edition, sets: 2 });
        expect(money).toHaveLength(
            2 * composePages('money', 'home', edition).length,
        );
        expect(money.flatMap((page) => page.items).every(carriesSetMark)).toBe(
            true,
        );
        const last = money.at(-1);
        expect(last && pageLabel(last, 'nl', 'eur')).toMatch(/· SET 2$/);
    });

    it('counts one set per row and multiplies in the bar', () => {
        const one = partQuantity('money', 'home', edition);

        expect(partQuantity('money', 'home', { ...edition, sets: 3 })).toEqual(
            one,
        );
    });
});

describe('the whole board', () => {
    it('is one page at full size with bleed and room for the crop marks', () => {
        const pages = composePages('board', 'printer', {
            ...edition,
            boardForm: 'whole',
        });

        expect(pages).toHaveLength(1);
        expect(pages[0]?.size.w).toBe(500 + 2 * (BLEED + 6));
        expect(pages[0]?.cropMarks.length).toBeGreaterThan(0);
        expect(
            partQuantity('board', 'printer', {
                ...edition,
                boardForm: 'whole',
            }),
        ).toEqual({ count: 1, unit: 'board', paper: null });
        // At home the board stays stickers.
        expect(
            composePages('board', 'home', { ...edition, boardForm: 'whole' })
                .length,
        ).toBeGreaterThan(1);
    });
});

describe('invitations by number', () => {
    it('take four to a sheet at home and are not multiplied by the sets', () => {
        const home = partQuantity('invitation', 'home', {
            ...edition,
            invitations: 80,
        });
        const shop = partQuantity('invitation', 'printer', {
            ...edition,
            invitations: 80,
        });

        expect(home).toEqual({ count: 20, unit: 'sheet', paper: 'A4' });
        expect(shop).toEqual({ count: 80, unit: 'invitation', paper: null });

        const estimate = setEstimate(
            [
                { part: 'invitation', quantity: shop },
                {
                    part: 'cards',
                    quantity: partQuantity('cards', 'printer', edition),
                },
            ],
            3,
        );

        expect(estimate.pieces).toEqual({ invitation: 80, card: 180 });
        expect(
            describeEstimate(
                estimate,
                3,
                (key) => key,
                (key, count) => `${String(count)} ${key}`,
            ),
        ).toBe('print.estimate.many');
    });
});
