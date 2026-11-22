import { differsFromBaseline } from '@/lib/edition/baseline';
import { isExtraCardKey, parseKey } from '@/lib/edition/keys';
import type { Edition, ElementOverride } from '@/lib/edition/types';
import { canClearNames, isNamedSpaceKey } from '@/lib/editor/clear-names';
import { canClearDeck, deckOfKey } from '@/lib/editor/extra-cards';
import { swapTargets } from '@/lib/editor/swap';
import {
    deedsFor,
    spaceAt,
    standardEdition,
} from '@/lib/game/standard-edition';
import type { Space } from '@/lib/game/types';

/**
 * The field panel has the same sections in the same order for every element (B141): Tekst, Afbeelding,
 * Bedragen, Stijl, and "Van vrienden" when a friend sent something. A section only shows when the type has
 * it (`docs/design/integratie-evaluatie.md` §3.3).
 */
export type PanelSection = 'text' | 'image' | 'amounts' | 'style';

/** What the ⋯ menu in the panel header offers for one element (§3.3, B142, B135, B194, B201). */
export type PanelAction =
    'reset' | 'swap' | 'removePawn' | 'removeCard' | 'clearDeck' | 'clearNames';

/** The space a key stands for: the space itself, or the space of a title deed. */
export function spaceOfKey(key: string): Space | undefined {
    const parsed = parseKey(key);
    const [, index] = key.split('.');

    if (parsed?.kind === 'space') {
        return spaceAt(Number(index));
    }
    if (parsed?.kind === 'deed') {
        return deedsFor()[Number(index) - 1];
    }

    return undefined;
}

/** A title deed has the sections of its space: it shows the same name, photo, amounts and colour. */
function spaceSections(space: Space): PanelSection[] {
    switch (space.type) {
        case 'street':
            return ['text', 'image', 'amounts', 'style'];
        case 'station':
        case 'utility':
        case 'tax':
            return ['text', 'image', 'amounts'];
        case 'chance':
        case 'chest':
            return ['text', 'image'];
        case 'corner':
            return space.corner === 'start'
                ? ['text', 'image', 'amounts']
                : ['text', 'image'];
    }
}

/** Whether a card has an amount to set: a standard card with money, or any extra card (B132, B135). */
function cardHasAmount(key: string): boolean {
    if (isExtraCardKey(key)) {
        return true;
    }
    const [, deck, index] = key.split('.');
    const card =
        deck === 'chance' || deck === 'chest'
            ? standardEdition.decks[deck][Number(index) - 1]
            : undefined;

    return card?.amount !== undefined && card.amount !== 0;
}

/** The sections of the field panel of an element, in their fixed order. */
export function panelSections(key: string): PanelSection[] {
    const kind = parseKey(key)?.kind;

    switch (kind) {
        case 'space':
        case 'deed': {
            const space = spaceOfKey(key);

            return space === undefined ? [] : spaceSections(space);
        }
        case 'boardCenter':
            return ['text', 'image', 'style'];
        case 'card':
            return cardHasAmount(key)
                ? ['text', 'image', 'amounts']
                : ['text', 'image'];
        case 'cardBack':
            // Photo or pattern, without free layers (B203).
            return ['image'];
        case 'note':
            // The name of the bank is still a field here; the edition panel takes it over (§3.2).
            return ['text', 'image', 'amounts', 'style'];
        case 'pawn':
        case 'houseRules':
        case 'invitation':
            return ['text', 'image'];
        case 'boxLid':
            return ['text', 'image', 'style'];
        default:
            return [];
    }
}

/**
 * Whether an element differs from its baseline (the template or the standard game, B152), so "Terug naar
 * standaard" has something to do.
 */
export function canReset(key: string, edition: Edition): boolean {
    if (
        parseKey(key)?.kind === 'themeAccent' ||
        !differsFromBaseline(edition, key)
    ) {
        return false;
    }
    const override = edition.elements[key];
    if (override === undefined) {
        return true;
    }
    if (isExtraCardKey(key)) {
        return Object.keys(override).some((field) => field !== 'added');
    }
    if (parseKey(key)?.kind === 'pawn') {
        return Object.keys(override).some((field) => field !== 'hidden');
    }

    return true;
}

/** The actions of the ⋯ menu of an element, in menu order. */
export function panelActions(key: string, edition: Edition): PanelAction[] {
    const actions: PanelAction[] = [];
    const kind = parseKey(key)?.kind;

    if (canReset(key, edition)) {
        actions.push('reset');
    }
    if (kind === 'space' && swapTargets(Number(key.split('.')[1])).length > 0) {
        actions.push('swap');
    }
    if (kind === 'pawn') {
        actions.push('removePawn');
    }
    if (isExtraCardKey(key) && edition.elements[key]?.added === true) {
        actions.push('removeCard');
    }
    // "Kaarten leegmaken" works on the whole deck, so every card and the back of the deck offer it (B194).
    const deck = deckOfKey(key);
    if (deck !== undefined && canClearDeck(edition, deck)) {
        actions.push('clearDeck');
    }
    // "Namen leegmaken" works on every street, station and utility, so each of them offers it (B201).
    if (isNamedSpaceKey(key) && canClearNames(edition)) {
        actions.push('clearNames');
    }

    return actions;
}

/** Whether going back to the standard throws away a photo, so the menu asks first (B142). */
export function resetLosesPhoto(
    override: ElementOverride | undefined,
): boolean {
    if (override === undefined) {
        return false;
    }

    return (
        override.photo !== undefined ||
        override.background !== undefined ||
        (override.icon !== undefined && 'photo' in override.icon) ||
        (override.layers ?? []).some((layer) => layer.kind === 'photo')
    );
}
