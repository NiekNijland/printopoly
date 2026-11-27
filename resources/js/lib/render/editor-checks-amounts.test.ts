import { describe, expect, it } from 'vitest';

import { updateElement } from '@/lib/render/edition-changes';
import type { Edition } from '@/lib/render/edition-types';
import { makeEdition } from '@/testing/edition-test-utils';

import { withAmountChecks, withCardTextChecks } from './editor-checks-amounts';

const withOverride = (
    edition: Edition,
    key: string,
    patch: Parameters<typeof updateElement>[2],
): Edition => updateElement(edition, key, patch).edition;

describe('editor-checks-amounts', () => {
    // chest.03 pays 50 (40 to 60).
    it('adds the problems of a card text with the amount of the card', () => {
        const edition = withOverride(
            makeEdition({ language: 'nl' }),
            'card.chest.03',
            { text: 'Betaal 45 aan de tandarts.' },
        );
        const [card] = withCardTextChecks([], edition);

        expect(card?.key).toBe('card.chest.03');
        expect(card?.cardText).toEqual([
            { kind: 'amount-differs', mentioned: 45 },
        ]);
        expect(card?.cardAmount).toMatchObject({
            value: -50,
            min: 40,
            max: 60,
        });
    });

    it('joins the card text to an element that is already there, without changing the input', () => {
        const edition = withOverride(makeEdition(), 'card.chest.03', {
            text: 'Betaal 45.',
        });
        const before = [{ key: 'card.chest.03', texts: [] }];
        const after = withCardTextChecks(before, edition);

        expect(after).toHaveLength(1);
        expect(after[0]?.texts).toEqual([]);
        expect(after[0]?.cardText).toHaveLength(1);
        expect(before[0]).toEqual({ key: 'card.chest.03', texts: [] });
    });

    it('finds an amount of a space outside 20% of the standard', () => {
        const edition = withOverride(makeEdition(), 'space.01', {
            amounts: { price: 1000 },
        });
        const [space] = withAmountChecks([], edition);

        expect(space?.key).toBe('space.01');
        expect(space?.amounts?.[0]).toMatchObject({
            field: 'amounts.price',
            value: 1000,
        });
    });

    it('finds an extra card amount over the maximum', () => {
        const edition = withOverride(makeEdition(), 'card.chance.17', {
            added: true,
            text: 'x',
            amount: 100000,
        });

        expect(withAmountChecks([], edition)[0]?.amounts?.[0]).toMatchObject({
            field: 'amount',
            value: 100000,
        });
        expect(withAmountChecks([], makeEdition())).toEqual([]);
    });
});
