import { setElement } from '@/lib/render/edition-changes';
import {
    MAX_DECK_SIZE,
    STANDARD_DECK_SIZE,
    cardKey,
    extraCardKeys,
    isExtraCardKey,
} from '@/lib/render/edition-keys';
import type { Edition, ElementChange } from '@/lib/render/edition-types';

type Deck = 'chance' | 'chest';

/**
 * Extra Chance and Community Chest cards (B135). A deck has the 16 standard cards and up to 16 extra ones,
 * `card.chance.17` to `card.chance.32`, each an element with `added: true`. They stay numbered without gaps:
 * taking one out moves the cards after it down by one, in one undo step.
 */

/** The key the next extra card of a deck gets, or `undefined` when the deck is full. */
export const nextExtraCardKey = (
    edition: Edition,
    deck: Deck,
): string | undefined => {
    const count = extraCardKeys(edition.elements, deck).length;
    const number = STANDARD_DECK_SIZE + count + 1;

    return number > MAX_DECK_SIZE ? undefined : cardKey(deck, number);
};

/** The change that adds an empty extra card at the end of a deck; `null` when the deck is full. */
export const addCardChange = (
    edition: Edition,
    deck: Deck,
): { key: string; change: ElementChange } | null => {
    const key = nextExtraCardKey(edition, deck);
    if (key === undefined) {
        return null;
    }
    const { change } = setElement(edition, key, { added: true });

    return change === null ? null : { key, change };
};

/** The changes that take an extra card out: every later extra card of the deck moves down one place. */
export const removeCardChanges = (
    edition: Edition,
    key: string,
): ElementChange[] => {
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
};

/** "Terug naar standaard" for an extra card: it stays in the deck, empty. */
export const clearCardChange = (
    edition: Edition,
    key: string,
): ElementChange | null => {
    return setElement(edition, key, { added: true }).change;
};

/** Every card of a deck: the 16 standard cards, then the extra ones. */
export const deckCardKeys = (edition: Edition, deck: Deck): string[] => {
    return [
        ...Array.from({ length: STANDARD_DECK_SIZE }, (_, index) =>
            cardKey(deck, index + 1),
        ),
        ...extraCardKeys(edition.elements, deck),
    ];
};

/** The deck of a card or of a card back, or `undefined` for any other element. */
export const deckOfKey = (key: string): Deck | undefined => {
    const match = /^card(?:_back)?\.(chance|chest)\b/.exec(key);

    return match === null ? undefined : (match[1] as Deck);
};

/** A card with no text of its own shows its standard text; an extra card without one is empty. */
export const cardHasText = (edition: Edition, key: string): boolean => {
    const element = edition.elements[key];

    return element?.text === undefined
        ? element?.added !== true
        : element.text.trim() !== '';
};

/** Whether "Kaarten leegmaken" would change anything: some card of the deck still has a text. */
export const canClearDeck = (edition: Edition, deck: Deck): boolean => {
    return deckCardKeys(edition, deck).some((key) => cardHasText(edition, key));
};

/**
 * "Kaarten leegmaken" (B194): every card of the deck loses its text and its "Waarvoor", so the owner writes the
 * deck from scratch when the template does not fit. Amounts, photos and the cards themselves stay. The changes go
 * in together, as one undo step.
 */
export const clearDeckChanges = (
    edition: Edition,
    deck: Deck,
): ElementChange[] => {
    const changes: ElementChange[] = [];
    let current = edition;
    for (const key of deckCardKeys(edition, deck)) {
        if (!cardHasText(current, key)) {
            continue;
        }
        const { purpose: _purpose, ...rest } = current.elements[key] ?? {};
        const result = setElement(current, key, { ...rest, text: '' });
        current = result.edition;
        if (result.change !== null) {
            changes.push(result.change);
        }
    }

    return changes;
};
