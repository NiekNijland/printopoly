import { useState } from 'react';

import { newCardDeck } from '@/features/edition/boxes/proposals';
import {
    MAX_EXTRA_CARD_AMOUNT,
    cardAmountRange,
} from '@/lib/render/edition-amounts';
import { isExtraCardKey } from '@/lib/render/edition-keys';
import { standardEdition } from '@/lib/render/standard-edition';

/**
 * The amount a friend can propose for a card (B175): within the range of the standard amount and in its direction,
 * or a free amount up to 500 on an extra or new card, paid or received. `null` for a card without an amount.
 */
const friendAmountRule = (
    key: string,
): { min: number; max: number; sign: 1 | -1 | null } | null => {
    if (newCardDeck(key) !== null || isExtraCardKey(key)) {
        return { min: 1, max: MAX_EXTRA_CARD_AMOUNT, sign: null };
    }
    const [kind, deck, index] = key.split('.');
    const card =
        kind === 'card' && (deck === 'chance' || deck === 'chest')
            ? standardEdition.decks[deck][Number(index) - 1]
            : undefined;
    const range = card === undefined ? undefined : cardAmountRange(card);

    return range === undefined || card?.amount === undefined
        ? null
        : { ...range, sign: card.amount < 0 ? -1 : 1 };
};

export const useFriendAmount = (elementKey: string) => {
    const rule = friendAmountRule(elementKey);
    const [amountText, setAmountText] = useState('');
    const [direction, setDirection] = useState<1 | -1>(-1);
    const sign = rule?.sign ?? direction;
    const amountNumber = amountText.trim() === '' ? null : Number(amountText);
    const amountValid =
        amountNumber === null ||
        (rule !== null &&
            Number.isInteger(amountNumber) &&
            amountNumber >= rule.min &&
            amountNumber <= rule.max);
    const amount =
        amountNumber !== null && amountValid ? sign * amountNumber : null;

    return {
        rule,
        amountText,
        setAmountText,
        direction,
        setDirection,
        amountValid,
        amount,
    };
};

export type FriendAmount = ReturnType<typeof useFriendAmount>;
