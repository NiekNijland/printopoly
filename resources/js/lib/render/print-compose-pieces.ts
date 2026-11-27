import { noteKey, pawnKey } from '@/lib/render/edition-keys';
import type { PageSpec, PrintEdition, PrintSet } from './print-composition';
import { impose, moneySheets } from './print-imposition';
import { defaultMoneyAmount, isMoneyAmount, noteCounts } from './print-money';
import type { MoneyAmount } from './print-money';
import { TOKEN_SIZE, fromImposition } from './print-page-frame';

const TOKEN_COUNT = 8;

/** The amount of play money of a set: the choice the edition or the print page made, else the default (B156). */
export const moneyAmountOf = (
    edition: Pick<PrintEdition, 'moneyAmount'>,
    set: PrintSet,
): MoneyAmount => {
    return isMoneyAmount(edition.moneyAmount)
        ? edition.moneyAmount
        : defaultMoneyAmount(set);
};

/**
 * The note a banknote index is: every note of the amount, dealt out value by value like cards (1, 5, 10, 20, 50,
 * 100, 500, 1, 5 …), so each sheet carries a mix and the PDF does not open on pages of only 1s (R5-29, Ria).
 */
const noteKeys = (amount: MoneyAmount): string[] => {
    const left = noteCounts(amount).map((note) => ({ ...note }));
    const keys: string[] = [];

    while (left.some((note) => note.count > 0)) {
        for (const note of left) {
            if (note.count > 0) {
                keys.push(noteKey(note.value));
                note.count -= 1;
            }
        }
    }

    return keys;
};

export const money = (
    sheet: 'A4' | 'SRA3',
    amount: MoneyAmount,
): PageSpec[] => {
    const keys = noteKeys(amount);

    return fromImposition(
        moneySheets(undefined, sheet, keys.length),
        'note',
        (index) => ({
            key: keys[index] ?? null,
            label: keys[index] ?? '',
        }),
    );
};

/** The pawns the edition keeps in the set: a pawn taken out has `hidden` (bug 32 of ronde 3). */
export const pawnKeysOf = (edition: PrintEdition): string[] => {
    return Array.from({ length: TOKEN_COUNT }, (_, i) => pawnKey(i + 1)).filter(
        (key) => edition.elements[key]?.hidden !== true,
    );
};

/** One slot per pawn in the set, so the heading says "Pionnen 1 t/m 5" for five pawns (bug 32 of ronde 3). */
export const tokens = (edition: PrintEdition): PageSpec[] => {
    const keys = pawnKeysOf(edition);

    return fromImposition(
        impose({
            item: TOKEN_SIZE,
            bleed: 0,
            sheet: 'A4',
            margin: 8,
            gap: 3,
            count: Math.max(1, keys.length),
            cropMarks: true,
            labelPrefix: 'Pionnen',
        }),
        'token',
        (index) => ({
            key: keys[index] ?? null,
            label: `Pion ${String(index + 1)}`,
        }),
    );
};
