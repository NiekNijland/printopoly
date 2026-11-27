import { is, oneOf } from '@/lib/parse';
import { standardEdition } from '@/lib/render/standard-edition';
import type { PrintSet } from '@/types/generated';

/**
 * How much play money a set prints (B156): enough for 2 to 4 players, enough for the starting split of 8, or
 * the full bank. The same counts are in `App\Enums\MoneyAmount`; print-document and the PDF check depend on
 * them being equal.
 */
export const MONEY_AMOUNTS = ['four', 'eight', 'full'] as const;

export type MoneyAmount = (typeof MONEY_AMOUNTS)[number];

const moneyAmount = oneOf(MONEY_AMOUNTS);

export const isMoneyAmount = (value: unknown) => is(moneyAmount, value);

/**
 * Notes per value. Every count is a multiple of 6, so a home sheet (6 notes) holds one value. "four" covers the
 * starting split of 4 players (20, 20, 20, 24, 8, 8, 8) with a small bank; "eight" covers the split of 8 (40, 40,
 * 40, 48, 16, 16, 16); "full" has at least the 30 of each value the original game has, on top of that.
 */
const NOTE_COUNTS: Readonly<
    Record<MoneyAmount, Readonly<Record<number, number>>>
> = {
    four: { 1: 24, 5: 24, 10: 24, 20: 30, 50: 12, 100: 18, 500: 12 },
    eight: { 1: 42, 5: 42, 10: 42, 20: 54, 50: 24, 100: 30, 500: 24 },
    full: { 1: 48, 5: 48, 10: 48, 20: 60, 50: 30, 100: 42, 500: 30 },
};

/** Players the amount is meant for, as the choice and the booklet say it. */
export const MONEY_PLAYERS: Readonly<
    Record<MoneyAmount, { min: number; max: number }>
> = {
    four: { min: 2, max: 4 },
    eight: { min: 2, max: 8 },
    full: { min: 2, max: 8 },
};

/** Without a choice: 2 to 4 players at home, the full bank at the print shop (B156). */
export const defaultMoneyAmount = (set: PrintSet): MoneyAmount => {
    return set === 'home' ? 'four' : 'full';
};

/** The notes of an amount, value and count, in the order of the standard edition. */
export const noteCounts = (
    amount: MoneyAmount,
): { value: number; count: number }[] => {
    return standardEdition.money.notes.map((note) => ({
        value: note.value,
        count: NOTE_COUNTS[amount][note.value] ?? note.count,
    }));
};

export const banknoteTotal = (amount: MoneyAmount): number => {
    return noteCounts(amount).reduce((sum, note) => sum + note.count, 0);
};
