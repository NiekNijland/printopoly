import { setElement } from '@/lib/edition/changes';
import {
    MAX_DECK_SIZE,
    STANDARD_DECK_SIZE,
    cardKey,
    extraCardKeys,
    isExtraCardKey,
} from '@/lib/edition/keys';
import type { Edition, ElementChange } from '@/lib/edition/types';

type Deck = 'chance' | 'chest';

/**
 * Extra Chance and Community Chest cards (B135). A deck has the 16 standard cards and up to 16 extra ones,
 * `card.chance.17` to `card.chance.32`, each an element with `added: true`. They stay numbered without gaps:
 * taking one out moves the cards after it down by one, in one undo step.
 */

/** The key the next extra card of a deck gets, or `undefined` when the deck is full. */
export function nextExtraCardKey(
    edition: Edition,
    deck: Deck,
): string | undefined {
    const count = extraCardKeys(edition.elements, deck).length;
    const number = STANDARD_DECK_SIZE + count + 1;

    return number > MAX_DECK_SIZE ? undefined : cardKey(deck, number);
}

/** The change that adds an empty extra card at the end of a deck; `null` when the deck is full. */
export function addCardChange(
    edition: Edition,
    deck: Deck,
): { key: string; change: ElementChange } | null {
    const key = nextExtraCardKey(edition, deck);
    if (key === undefined) {
        return null;
    }
    const { change } = setElement(edition, key, { added: true });

    return change === null ? null : { key, change };
}

/** The changes that take an extra card out: every later extra card of the deck moves down one place. */
export function removeCardChanges(
    edition: Edition,
    key: string,
): ElementChange[] {
    if (!isExtraCardKey(key) || edition.elements[key]?.added !== true) {
        return [];
    }
    const deck = key.split('.')[1] as Deck;
    const keys = extraCardKeys(edition.elements, deck);
    const from = keys.indexOf(key);
    const changes: ElementChange[] = [];
    let current = edition;

    for (let index = from; index < keys.length; index++) {
        const at = keys[index];
        if (at === undefined) {
            continue;
        }
        const next = keys[index + 1];
        const result = setElement(
            current,
            at,
            next === undefined ? undefined : current.elements[next],
        );
        current = result.edition;
        if (result.change !== null) {
            changes.push(result.change);
        }
    }

    return changes;
}

/** "Terug naar standaard" for an extra card: it stays in the deck, empty. */
export function clearCardChange(
    edition: Edition,
    key: string,
): ElementChange | null {
    return setElement(edition, key, { added: true }).change;
}
