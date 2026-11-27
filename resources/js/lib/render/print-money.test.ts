import { describe, expect, it } from 'vitest';

import {
    MONEY_AMOUNTS,
    MONEY_PLAYERS,
    banknoteTotal,
    defaultMoneyAmount,
    isMoneyAmount,
    noteCounts,
} from './print-money';

describe('isMoneyAmount', () => {
    it('accepts the three amounts', () => {
        expect(MONEY_AMOUNTS.every((amount) => isMoneyAmount(amount))).toBe(
            true,
        );
    });

    it('rejects anything else', () => {
        expect(isMoneyAmount('six')).toBe(false);
        expect(isMoneyAmount(4)).toBe(false);
        expect(isMoneyAmount(undefined)).toBe(false);
    });
});

describe('defaultMoneyAmount', () => {
    it('prints for 2 to 4 players at home and the full bank at the print shop', () => {
        expect(defaultMoneyAmount('home')).toBe('four');
        expect(defaultMoneyAmount('printer')).toBe('full');
    });
});

describe('noteCounts', () => {
    it('lists the notes in the order of the standard edition', () => {
        expect(noteCounts('four')).toEqual([
            { value: 1, count: 24 },
            { value: 5, count: 24 },
            { value: 10, count: 24 },
            { value: 20, count: 30 },
            { value: 50, count: 12 },
            { value: 100, count: 18 },
            { value: 500, count: 12 },
        ]);
    });

    it('keeps every count a multiple of six, so a home sheet holds one value', () => {
        for (const amount of MONEY_AMOUNTS) {
            expect(
                noteCounts(amount).every((note) => note.count % 6 === 0),
            ).toBe(true);
        }
    });

    it('gives the full bank at least the 30 of each value of the original game', () => {
        expect(noteCounts('full').every((note) => note.count >= 30)).toBe(true);
    });
});

describe('banknoteTotal', () => {
    it('adds up the notes of an amount', () => {
        expect(banknoteTotal('four')).toBe(144);
        expect(banknoteTotal('eight')).toBe(258);
        expect(banknoteTotal('full')).toBe(306);
    });
});

describe('MONEY_PLAYERS', () => {
    it('names the players each amount is meant for', () => {
        expect(MONEY_PLAYERS.four).toEqual({ min: 2, max: 4 });
        expect(MONEY_PLAYERS.eight.max).toBe(8);
    });
});
