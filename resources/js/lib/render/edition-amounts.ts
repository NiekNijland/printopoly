import type { Card, Space } from '@/types/game';
import { spaceKey } from './edition-keys';
import type { ElementOverride } from './edition-types';

/**
 * Amounts you may change (B132): every amount of the game can move 20% up or down from the standard amount, in
 * whole amounts. `app/Edition/Amounts.php` holds the same rules for the server.
 *
 * Amounts of a space live in `ElementOverride.amounts` of `space.NN`, keyed by the field ids below. What is
 * derived stays derived: the rent for a full colour set is twice the base rent, and getting a mortgage back costs
 * a tenth more. The mortgage has its own 20% around the standard mortgage, and the house cost is also the hotel
 * cost, so it is one field.
 */
const AMOUNT_TOLERANCE_PERCENT = 20;

export type AmountRange = {
    min: number;
    max: number;
};

/** Whole amounts between 80% and 120% of the standard amount: 60 gives 48 to 72, a rent of 2 stays 2. */
export const amountRange = (standard: number): AmountRange => {
    const base = Math.abs(standard);

    return {
        min: Math.round((base * (100 - AMOUNT_TOLERANCE_PERCENT)) / 100),
        max: Math.round((base * (100 + AMOUNT_TOLERANCE_PERCENT)) / 100),
    };
};

export const clampAmount = (value: number, standard: number): number => {
    const { min, max } = amountRange(standard);

    return Math.min(max, Math.max(min, Math.round(value)));
};

/** One adjustable amount of a space: its id and the standard value. */
export type AmountField = {
    id: string;
    standard: number;
};

/** The adjustable amounts of a space, in the order a deed lists them. */
export const amountFields = (space: Space): AmountField[] => {
    switch (space.type) {
        case 'street':
            return [
                { id: 'price', standard: space.price },
                ...space.rent.map((standard, index) => ({
                    id: `rent.${String(index)}`,
                    standard,
                })),
                { id: 'houseCost', standard: space.houseCost },
                { id: 'mortgage', standard: space.mortgage },
            ];
        case 'station':
            return [
                { id: 'price', standard: space.price },
                ...space.rent.map((standard, index) => ({
                    id: `rent.${String(index)}`,
                    standard,
                })),
                { id: 'mortgage', standard: space.mortgage },
            ];
        case 'utility':
            return [
                { id: 'price', standard: space.price },
                { id: 'mortgage', standard: space.mortgage },
            ];
        case 'tax':
            return [{ id: 'amount', standard: space.amount }];
        case 'corner':
            return space.corner === 'start' && space.salary !== undefined
                ? [{ id: 'salary', standard: space.salary }]
                : [];
        case 'chance':
        case 'chest':
            return [];
    }
};

export const amountField = (
    space: Space,
    id: string,
): AmountField | undefined => {
    return amountFields(space).find((field) => field.id === id);
};

/**
 * The space with its own amounts filled in. A value outside the range is pulled into it, so a damaged edition can
 * never print an amount the rules do not allow; unknown ids are ignored.
 */
export const applyAmounts = (
    space: Space,
    amounts: Readonly<Record<string, number>> | undefined,
): Space => {
    if (amounts === undefined) {
        return space;
    }
    const value = (id: string, standard: number): number => {
        const own = amounts[id];

        return own === undefined ? standard : clampAmount(own, standard);
    };
    const rent = (index: number, standard: number): number =>
        value(`rent.${String(index)}`, standard);

    switch (space.type) {
        case 'street': {
            const [r0, r1, r2, r3, r4, r5] = space.rent;

            return {
                ...space,
                price: value('price', space.price),
                rent: [
                    rent(0, r0),
                    rent(1, r1),
                    rent(2, r2),
                    rent(3, r3),
                    rent(4, r4),
                    rent(5, r5),
                ],
                houseCost: value('houseCost', space.houseCost),
                mortgage: value('mortgage', space.mortgage),
            };
        }
        case 'station': {
            const [r0, r1, r2, r3] = space.rent;

            return {
                ...space,
                price: value('price', space.price),
                rent: [rent(0, r0), rent(1, r1), rent(2, r2), rent(3, r3)],
                mortgage: value('mortgage', space.mortgage),
            };
        }
        case 'utility':
            return {
                ...space,
                price: value('price', space.price),
                mortgage: value('mortgage', space.mortgage),
            };
        case 'tax':
            return { ...space, amount: value('amount', space.amount) };
        case 'corner':
            return space.salary === undefined
                ? space
                : { ...space, salary: value('salary', space.salary) };
        case 'chance':
        case 'chest':
            return space;
    }
};

/** The amount on a card, signed: plus is received, minus is paid. `undefined` for a card without an amount. */
export const cardAmountRange = (card: Card): AmountRange | undefined => {
    return card.amount === undefined || card.amount === 0
        ? undefined
        : amountRange(card.amount);
};

/** The largest amount on an extra card (B135): it has no standard amount, so it gets a free amount up to this. */
export const MAX_EXTRA_CARD_AMOUNT = 500;

/** Whether `value` (signed: minus is paid) is an allowed amount on an extra card: a whole amount from 1 to 500. */
export const isExtraCardAmountAllowed = (value: number): boolean => {
    return (
        Number.isInteger(value) &&
        value !== 0 &&
        Math.abs(value) <= MAX_EXTRA_CARD_AMOUNT
    );
};

/** The own amount that switches the amount line of a card off, for a card whose rewritten text has no money in it. */
export const NO_CARD_AMOUNT = 0;

/**
 * Whether `value` (signed) is an allowed amount for the card: within the range, paid or received (R5-11: the
 * direction is the owner's choice). Zero is allowed too and means: no amount line (the text of the card says it all).
 */
export const isCardAmountAllowed = (card: Card, value: number): boolean => {
    if (card.amount === undefined || card.amount === 0) {
        return false;
    }
    if (value === NO_CARD_AMOUNT) {
        return true;
    }
    const range = amountRange(card.amount);

    return (
        Number.isInteger(value) &&
        Math.abs(value) >= range.min &&
        Math.abs(value) <= range.max
    );
};

/** The amount of a card as printed: the card's own amount pulled into the range, else the standard one. */
export const resolveCardAmount = (
    card: Card,
    own: number | undefined,
): number | undefined => {
    if (card.amount === undefined || card.amount === 0) {
        return undefined;
    }
    if (own === NO_CARD_AMOUNT) {
        return NO_CARD_AMOUNT;
    }
    if (own === undefined) {
        return card.amount;
    }

    // The sign of its own amount says whether the player pays or receives (R5-11).
    return Math.sign(own) * clampAmount(Math.abs(own), card.amount);
};

/** The amount `id` of a space as the edition has it: its own value pulled into the range, else the standard one. */
export const amountOf = (
    edition: { elements: Readonly<Record<string, ElementOverride>> },
    space: Space,
    id: string,
): number => {
    const field = amountField(space, id);
    if (field === undefined) {
        return 0;
    }
    const own = edition.elements[spaceKey(space.position)]?.amounts?.[id];

    return own === undefined
        ? field.standard
        : clampAmount(own, field.standard);
};
