import { firstStreetKey } from '@/lib/render/boxes-labels';
import {
    baselineElement,
    differsFromBaseline,
    fieldDiffers,
} from '@/lib/render/edition-baseline';
import { setElement, updateElement } from '@/lib/render/edition-changes';
import {
    BOARD_CENTER_KEY,
    GROUP_IDS,
    groupKey,
    parseKey,
    wordKey,
    type WordId,
} from '@/lib/render/edition-keys';
import { STYLED_PARTS, partStyleKey } from '@/lib/render/edition-part-styles';
import type { SettingsChange } from '@/lib/render/edition-settings';
import {
    type Edition,
    type ElementChange,
    type ElementField,
} from '@/lib/render/edition-types';
import { defaultCurrency, isDefaultCurrency } from '@/lib/render/game-currency';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import type { CurrencyId } from '@/types/game';

/**
 * The edition panel (B145): everything that holds for the whole edition, in fixed sections and always in this
 * order. "Samen maken" is the last one (B146).
 */
export const EDITION_SECTIONS = [
    'general',
    'look',
    'words',
    'board',
    'together',
] as const;
export type EditionSection = (typeof EDITION_SECTIONS)[number];

/** The quick choices of the one currency field (B147), in the order they show. */
export const CURRENCY_CHOICES: readonly CurrencyId[] = [
    'eur',
    'play',
    'usd',
    'gbp',
];

/** The words in the Woorden section; the currency is in Algemeen (B147). */
const SECTION_WORDS: readonly WordId[] = [
    'house',
    'hotel',
    'station',
    'utility',
    'jail',
    'chance',
    'chest',
    'bank',
];

const CURRENCY_KEY = wordKey('currency');

/** The section of the edition panel an element key belongs to, or `null` for an element with its own panel. */
export const sectionOfKey = (key: string): EditionSection | null => {
    if (key === CURRENCY_KEY) {
        return 'general';
    }
    switch (parseKey(key)?.kind) {
        case 'themeAccent':
        case 'partStyle':
            return 'look';
        case 'words':
            return 'words';
        default:
            return null;
    }
};

/** The standard currency of a language: euro in Dutch, pound in English (B154). */

/** What the currency field shows: one of the four, or the edition's own name and sign. */
export const currencyChoice = (edition: Edition): CurrencyId | 'custom' => {
    const own = edition.elements[CURRENCY_KEY];

    return own?.name !== undefined || own?.text !== undefined
        ? 'custom'
        : edition.currency;
};

/** Picks one of the four currencies: the own name and sign go, in one undo step (B147). */
export const chooseCurrency = (
    edition: Edition,
    currency: CurrencyId,
): SettingsChange => {
    const { edition: next, change } = setElement(
        edition,
        CURRENCY_KEY,
        undefined,
    );

    return {
        edition: { ...next, currency },
        changes: change === null ? [] : [change],
        summary: '',
    };
};

/** Puts fields of an element back to the baseline of the edition (B152). */
const clearFields = (
    edition: Edition,
    key: string,
    fields: readonly ElementField[],
): { edition: Edition; change: ElementChange | null } => {
    const base = baselineElement(edition, key);
    const patch = Object.fromEntries(
        fields.map((field) => [field, structuredClone(base?.[field])]),
    );

    return updateElement(edition, key, patch);
};

/** The element fields a section owns, as `[key, fields]`; `null` fields means the whole element. */
const sectionFields = (
    section: EditionSection,
): readonly (readonly [string, readonly ElementField[] | null])[] => {
    switch (section) {
        case 'general':
            return [
                [CURRENCY_KEY, null],
                [BOARD_CENTER_KEY, ['subtitle']],
            ];
        case 'look':
            // The group colours and the style of each part (B268); an accent stored before B203 is ignored.
            return [
                ...GROUP_IDS.map((id) => [groupKey(id), ['color']] as const),
                ...STYLED_PARTS.map(
                    (part) => [partStyleKey(part), null] as const,
                ),
            ];
        case 'words':
            return SECTION_WORDS.map((id) => [wordKey(id), null] as const);
        default:
            return [];
    }
};

const differs = (
    edition: Edition,
    key: string,
    fields: readonly ElementField[] | null,
) => {
    return fields === null
        ? differsFromBaseline(edition, key)
        : fields.some((field) => fieldDiffers(edition, key, field));
};

/**
 * Whether a section differs from the baseline (the template or the standard game, B152), so it offers "Alles in
 * deze sectie terug naar standaard".
 */
export const sectionDiffers = (
    edition: Edition,
    section: EditionSection,
): boolean => {
    switch (section) {
        case 'general':
            return (
                !isDefaultCurrency(edition.language, edition.currency) ||
                sectionFields(section).some(([key, fields]) =>
                    differs(edition, key, fields),
                )
            );
        case 'board':
            return edition.boardProfile.id !== DEFAULT_BOARD_PROFILE.id;
        case 'together':
            return false;
        default:
            return sectionFields(section).some(([key, fields]) =>
                differs(edition, key, fields),
            );
    }
};

/**
 * Puts a whole section back to the baseline in one step: the template the edition started from, or the standard
 * game (B152). Name, language and theme are choices, not changes, so they stay.
 */
export const resetSection = (
    edition: Edition,
    section: EditionSection,
): SettingsChange => {
    let next = edition;
    const changes: ElementChange[] = [];

    for (const [key, fields] of sectionFields(section)) {
        const base = baselineElement(next, key);
        const step =
            fields === null
                ? setElement(
                      next,
                      key,
                      base === undefined ? undefined : structuredClone(base),
                  )
                : clearFields(next, key, fields);
        next = step.edition;
        if (step.change !== null) {
            changes.push(step.change);
        }
    }

    if (section === 'general') {
        next = { ...next, currency: defaultCurrency(next.language) };
    } else if (section === 'board') {
        next = { ...next, boardProfile: DEFAULT_BOARD_PROFILE };
    }

    return { edition: next, changes, summary: '' };
};

/** How many words of the Woorden section the edition changed, for the folded section on a phone. */
export const changedWords = (edition: Edition): number => {
    return SECTION_WORDS.filter((id) =>
        differsFromBaseline(edition, wordKey(id)),
    ).length;
};

/**
 * The element a contribution of a friend belongs to, to open from "Van vrienden" (B146): the element itself, or
 * for the town of a colour group its first street, where the town shows.
 */
export const contributionElement = (key: string): string => {
    return key.startsWith('group.') ? (firstStreetKey(key) ?? key) : key;
};

/** The first element with a contribution waiting, in the order they came in. */
export const firstContributionElement = (
    contributions: readonly { elementKey: string }[],
): string | undefined => {
    const first = contributions[0];

    return first === undefined
        ? undefined
        : contributionElement(first.elementKey);
};
