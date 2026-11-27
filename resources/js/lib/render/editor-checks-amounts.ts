import type { CheckAmount, CheckElement } from '@/lib/render/checks-types';
import {
    amountField,
    amountRange,
    isCardAmountAllowed,
    isExtraCardAmountAllowed,
    MAX_EXTRA_CARD_AMOUNT,
    resolveCardAmount,
} from '@/lib/render/edition-amounts';
import { cardTextProblems } from '@/lib/render/edition-card-text-problems';
import { isExtraCardKey, parseKey } from '@/lib/render/edition-keys';
import type { Edition, ElementOverride } from '@/lib/render/edition-types';
import { resolveWords } from '@/lib/render/edition-words';
import { formatMoney, standardEdition } from '@/lib/render/standard-edition';

const standardCardOf = (key: string) => {
    const [, deck, index] = key.split('.');

    return deck === 'chance' || deck === 'chest'
        ? standardEdition.decks[deck][Number(index) - 1]
        : undefined;
};

/** The amount a card prints with: free on an extra card (B135), else within 20% of the standard amount. */
const cardAmountOf = (
    key: string,
    override: ElementOverride,
): number | undefined => {
    if (isExtraCardKey(key)) {
        return override.amount !== undefined &&
            isExtraCardAmountAllowed(override.amount)
            ? override.amount
            : undefined;
    }
    const standard = standardCardOf(key);

    return standard === undefined
        ? undefined
        : resolveCardAmount(standard, override.amount);
};

/** The amounts a card may take, as positive numbers: 20% around the standard, or up to 500 on an extra card. */
const cardRange = (key: string): { min: number; max: number } => {
    const standard = standardCardOf(key)?.amount;

    return isExtraCardKey(key) || standard === undefined
        ? { min: 1, max: MAX_EXTRA_CARD_AMOUNT }
        : amountRange(Math.abs(standard));
};

/** An amount as the card prints it: "€ 18". */
const shownAmount = (edition: Edition, amount: number): string => {
    return formatMoney(
        Math.abs(amount),
        edition.currency,
        edition.language,
        resolveWords(edition).customSymbol,
    );
};

/** B132: the amounts of one element that are outside 20% of the standard amount. */
const amountProblems = (
    key: string,
    override: ElementOverride,
): CheckAmount[] => {
    const kind = parseKey(key)?.kind;
    const problems: CheckAmount[] = [];

    if (kind === 'space' && override.amounts !== undefined) {
        const space = standardEdition.spaces[Number(key.split('.')[1])];
        for (const [id, value] of Object.entries(override.amounts)) {
            const field =
                space === undefined ? undefined : amountField(space, id);
            if (field === undefined) {
                continue;
            }
            const range = amountRange(field.standard);
            if (
                !Number.isInteger(value) ||
                value < range.min ||
                value > range.max
            ) {
                problems.push({ field: `amounts.${id}`, value, ...range });
            }
        }
    }
    if (
        kind === 'card' &&
        override.amount !== undefined &&
        isExtraCardKey(key) &&
        !isExtraCardAmountAllowed(override.amount)
    ) {
        problems.push({
            field: 'amount',
            value: override.amount,
            min: -MAX_EXTRA_CARD_AMOUNT,
            max: MAX_EXTRA_CARD_AMOUNT,
        });
    }
    if (
        kind === 'card' &&
        override.amount !== undefined &&
        !isExtraCardKey(key)
    ) {
        const card = standardCardOf(key);
        if (
            card?.amount !== undefined &&
            !isCardAmountAllowed(card, override.amount)
        ) {
            problems.push({
                field: 'amount',
                value: override.amount,
                ...amountRange(card.amount),
            });
        }
    }

    return problems;
};

/** The card texts of the edition with what the Controle has to say about them (B131), after `elements`. */
export const withCardTextChecks = (
    elements: CheckElement[],
    edition: Edition,
): CheckElement[] => {
    const out = [...elements];

    for (const [key, override] of Object.entries(edition.elements)) {
        if (parseKey(key)?.kind !== 'card' || override.text === undefined) {
            continue;
        }
        const amount = cardAmountOf(key, override);
        const cardText = cardTextProblems(override.text, edition, amount);
        if (cardText.length === 0) {
            continue;
        }
        const cardAmount =
            amount === undefined || amount === 0
                ? undefined
                : {
                      value: amount,
                      shown: shownAmount(edition, amount),
                      ...cardRange(key),
                  };
        const at = out.findIndex((element) => element.key === key);
        const existing = out[at];
        const extra = cardAmount === undefined ? {} : { cardAmount };
        if (existing === undefined) {
            out.push({ key, cardText, ...extra });
        } else {
            out[at] = { ...existing, cardText, ...extra };
        }
    }

    return out;
};

/** The amounts of the edition outside their range (B132), after `elements`. */
export const withAmountChecks = (
    elements: CheckElement[],
    edition: Edition,
): CheckElement[] => {
    const out = [...elements];

    for (const [key, override] of Object.entries(edition.elements)) {
        const amounts = amountProblems(key, override);
        if (amounts.length === 0) {
            continue;
        }
        const at = out.findIndex((element) => element.key === key);
        const existing = out[at];
        if (existing === undefined) {
            out.push({ key, amounts });
        } else {
            out[at] = { ...existing, amounts };
        }
    }

    return out;
};
