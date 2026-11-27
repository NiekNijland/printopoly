import { describe, expect, it } from 'vitest';

import type { Card } from '@/types/game';

import {
    NO_CARD_AMOUNT,
    amountField,
    amountFields,
    amountOf,
    amountRange,
    applyAmounts,
    cardAmountRange,
    clampAmount,
    isCardAmountAllowed,
    isExtraCardAmountAllowed,
    resolveCardAmount,
} from './edition-amounts';
import { spaceAt } from './standard-edition';

const card = (amount?: number): Card => ({
    id: 'chance.99',
    effect: { nl: 'Betaal', en: 'Pay' },
    text: { nl: 'Betaal', en: 'Pay' },
    ...(amount === undefined ? {} : { amount }),
});

describe('amountRange', () => {
    it('allows 20% up and down in whole amounts', () => {
        expect(amountRange(60)).toEqual({ min: 48, max: 72 });
        expect(amountRange(2)).toEqual({ min: 2, max: 2 });
    });

    it('works from the size of a negative amount', () => {
        expect(amountRange(-100)).toEqual({ min: 80, max: 120 });
    });
});

describe('clampAmount', () => {
    it('pulls a value into the range and rounds it', () => {
        expect(clampAmount(10, 60)).toBe(48);
        expect(clampAmount(100, 60)).toBe(72);
        expect(clampAmount(55.6, 60)).toBe(56);
    });
});

describe('amountFields', () => {
    it('lists price, six rents, house cost and mortgage of a street', () => {
        expect(amountFields(spaceAt(1)).map((field) => field.id)).toEqual([
            'price',
            'rent.0',
            'rent.1',
            'rent.2',
            'rent.3',
            'rent.4',
            'rent.5',
            'houseCost',
            'mortgage',
        ]);
    });

    it('lists price, four rents and mortgage of a station', () => {
        expect(amountFields(spaceAt(5))).toEqual([
            { id: 'price', standard: 200 },
            { id: 'rent.0', standard: 25 },
            { id: 'rent.1', standard: 50 },
            { id: 'rent.2', standard: 100 },
            { id: 'rent.3', standard: 200 },
            { id: 'mortgage', standard: 100 },
        ]);
    });

    it('lists price and mortgage of a utility and the amount of a tax', () => {
        expect(amountFields(spaceAt(12)).map((field) => field.id)).toEqual([
            'price',
            'mortgage',
        ]);
        expect(amountFields(spaceAt(4))).toEqual([
            { id: 'amount', standard: 200 },
        ]);
    });

    it('lists the salary of Start only, and nothing for decks and other corners', () => {
        expect(amountFields(spaceAt(0))).toEqual([
            { id: 'salary', standard: 200 },
        ]);
        expect(amountFields(spaceAt(10))).toEqual([]);
        expect(amountFields(spaceAt(2))).toEqual([]);
        expect(amountFields(spaceAt(7))).toEqual([]);
    });
});

describe('amountField', () => {
    it('finds one field by id, or undefined', () => {
        expect(amountField(spaceAt(1), 'houseCost')).toEqual({
            id: 'houseCost',
            standard: 50,
        });
        expect(amountField(spaceAt(1), 'salary')).toBeUndefined();
    });
});

describe('applyAmounts', () => {
    it('returns the same space without own amounts', () => {
        const space = spaceAt(1);

        expect(applyAmounts(space, undefined)).toBe(space);
    });

    it('fills in the own amounts of a street, clamped to the range', () => {
        const result = applyAmounts(spaceAt(1), {
            price: 70,
            'rent.5': 1000,
            houseCost: 1,
            mortgage: 33,
        });

        expect(result).toMatchObject({
            price: 70,
            rent: [2, 10, 30, 90, 160, 300],
            houseCost: 40,
            mortgage: 33,
        });
    });

    it('fills in the own amounts of a station and a utility', () => {
        expect(
            applyAmounts(spaceAt(5), { 'rent.1': 55, price: 230 }),
        ).toMatchObject({
            price: 230,
            rent: [25, 55, 100, 200],
            mortgage: 100,
        });
        expect(applyAmounts(spaceAt(12), { mortgage: 100 })).toMatchObject({
            price: 150,
            mortgage: 90,
        });
    });

    it('fills in a tax amount and the Start salary', () => {
        expect(applyAmounts(spaceAt(4), { amount: 220 })).toMatchObject({
            amount: 220,
        });
        expect(applyAmounts(spaceAt(0), { salary: 500 })).toMatchObject({
            salary: 240,
        });
    });

    it('leaves corners without salary and deck spaces unchanged', () => {
        const jail = spaceAt(10);
        const chance = spaceAt(7);

        expect(applyAmounts(jail, { salary: 100 })).toBe(jail);
        expect(applyAmounts(chance, { price: 100 })).toBe(chance);
    });
});

describe('card amounts', () => {
    it('gives the range of a card with an amount only', () => {
        expect(cardAmountRange(card(-150))).toEqual({ min: 120, max: 180 });
        expect(cardAmountRange(card())).toBeUndefined();
        expect(cardAmountRange(card(0))).toBeUndefined();
    });

    it('allows a whole amount from 1 to 500 on an extra card, paid or received', () => {
        expect(isExtraCardAmountAllowed(500)).toBe(true);
        expect(isExtraCardAmountAllowed(-1)).toBe(true);
        expect(isExtraCardAmountAllowed(0)).toBe(false);
        expect(isExtraCardAmountAllowed(501)).toBe(false);
        expect(isExtraCardAmountAllowed(2.5)).toBe(false);
    });

    it('allows an amount in the range of the card in either direction, or zero', () => {
        expect(isCardAmountAllowed(card(100), -110)).toBe(true);
        expect(isCardAmountAllowed(card(100), 120)).toBe(true);
        expect(isCardAmountAllowed(card(100), NO_CARD_AMOUNT)).toBe(true);
        expect(isCardAmountAllowed(card(100), 121)).toBe(false);
        expect(isCardAmountAllowed(card(100), 79)).toBe(false);
        expect(isCardAmountAllowed(card(100), 90.5)).toBe(false);
    });

    it('allows no amount on a card that has none', () => {
        expect(isCardAmountAllowed(card(), 50)).toBe(false);
        expect(isCardAmountAllowed(card(0), 0)).toBe(false);
    });

    it('resolves the printed amount of a card', () => {
        expect(resolveCardAmount(card(), 50)).toBeUndefined();
        expect(resolveCardAmount(card(-100), undefined)).toBe(-100);
        expect(resolveCardAmount(card(-100), NO_CARD_AMOUNT)).toBe(0);
        expect(resolveCardAmount(card(-100), 200)).toBe(120);
        expect(resolveCardAmount(card(100), -90)).toBe(-90);
    });
});

describe('amountOf', () => {
    it('reads the own amount of a space, clamped, else the standard', () => {
        const edition = {
            elements: { 'space.01': { amounts: { price: 100, mortgage: 28 } } },
        };

        expect(amountOf(edition, spaceAt(1), 'price')).toBe(72);
        expect(amountOf(edition, spaceAt(1), 'mortgage')).toBe(28);
        expect(amountOf(edition, spaceAt(1), 'houseCost')).toBe(50);
        expect(amountOf({ elements: {} }, spaceAt(3), 'rent.0')).toBe(4);
    });

    it('returns zero for a field the space does not have', () => {
        expect(amountOf({ elements: {} }, spaceAt(2), 'price')).toBe(0);
    });
});
