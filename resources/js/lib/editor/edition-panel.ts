import { firstStreetKey } from '@/lib/boxes/labels';
import {
    baselineElement,
    baselineOf,
    differsFromBaseline,
    fieldDiffers,
} from '@/lib/edition/baseline';
import { setElement, updateElement } from '@/lib/edition/changes';
import {
    BOARD_CENTER_KEY,
    GROUP_IDS,
    THEME_ACCENT_KEY,
    groupKey,
    parseKey,
    wordKey,
    type WordId,
} from '@/lib/edition/keys';
import type { SettingsChange } from '@/lib/edition/settings';
import {
    PART_IDS,
    type Edition,
    type ElementChange,
    type ElementField,
    type PartId,
} from '@/lib/edition/types';
import type { CurrencyId, Locale } from '@/lib/game/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';

/**
 * The edition panel (B145): everything that holds for the whole edition, in fixed sections and always in this
 * order. "Samen maken" is the last one (B146).
 */
export const EDITION_SECTIONS = [
    'general',
    'look',
    'words',
    'parts',
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
    'jail',
    'chance',
    'chest',
    'bank',
];

/** "Het spel" and "Extra drukwerk" in Onderdelen; the board is always on and is not a choice. */
export const GAME_PARTS: readonly PartId[] = [
    'deeds',
    'cards',
    'money',
    'pawns',
    'boxLid',
    'houseRules',
];
export const EXTRA_PARTS: readonly PartId[] = [
    'rulesBooklet',
    'foldModels',
    'dice',
    'invitation',
];

const CURRENCY_KEY = wordKey('currency');

/** The section of the edition panel an element key belongs to, or `null` for an element with its own panel. */
export function sectionOfKey(key: string): EditionSection | null {
    if (key === CURRENCY_KEY) {
        return 'general';
    }
    switch (parseKey(key)?.kind) {
        case 'themeAccent':
            return 'look';
        case 'words':
            return 'words';
        default:
            return null;
    }
}

/** The standard currency of a language: euro in Dutch, M in English (B72). */
export function defaultCurrency(language: Locale): CurrencyId {
    return language === 'nl' ? 'eur' : 'play';
}

/** What the currency field shows: one of the four, or the edition's own name and sign. */
export function currencyChoice(edition: Edition): CurrencyId | 'custom' {
    const own = edition.elements[CURRENCY_KEY];

    return own?.name !== undefined || own?.text !== undefined
        ? 'custom'
        : edition.currency;
}

/** Picks one of the four currencies: the own name and sign go, in one undo step (B147). */
export function chooseCurrency(
    edition: Edition,
    currency: CurrencyId,
): SettingsChange {
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
}

/** Puts fields of an element back to the baseline of the edition (B152). */
function clearFields(
    edition: Edition,
    key: string,
    fields: readonly ElementField[],
): { edition: Edition; change: ElementChange | null } {
    const base = baselineElement(edition, key);
    const patch = Object.fromEntries(
        fields.map((field) => [field, structuredClone(base?.[field])]),
    );

    return updateElement(edition, key, patch);
}

/** The element fields a section owns, as `[key, fields]`; `null` fields means the whole element. */
function sectionFields(
    section: EditionSection,
): readonly (readonly [string, readonly ElementField[] | null])[] {
    switch (section) {
        case 'general':
            return [
                [CURRENCY_KEY, null],
                [BOARD_CENTER_KEY, ['subtitle']],
            ];
        case 'look':
            return [
                [THEME_ACCENT_KEY, null],
                ...GROUP_IDS.map((id) => [groupKey(id), ['color']] as const),
            ];
        case 'words':
            return SECTION_WORDS.map((id) => [wordKey(id), null] as const);
        default:
            return [];
    }
}

function differs(
    edition: Edition,
    key: string,
    fields: readonly ElementField[] | null,
) {
    return fields === null
        ? differsFromBaseline(edition, key)
        : fields.some((field) => fieldDiffers(edition, key, field));
}

/**
 * Whether a section differs from the baseline (the template or the standard game, B152), so it offers "Alles in
 * deze sectie terug naar standaard".
 */
export function sectionDiffers(
    edition: Edition,
    section: EditionSection,
): boolean {
    switch (section) {
        case 'general':
            return (
                edition.currency !== defaultCurrency(edition.language) ||
                sectionFields(section).some(([key, fields]) =>
                    differs(edition, key, fields),
                )
            );
        case 'parts': {
            const { parts } = baselineOf(edition);

            return (
                edition.moneyAmount !== undefined ||
                PART_IDS.some((part) => edition.parts[part] !== parts[part])
            );
        }
        case 'board':
            return edition.boardProfile.id !== DEFAULT_BOARD_PROFILE.id;
        case 'together':
            return false;
        default:
            return sectionFields(section).some(([key, fields]) =>
                differs(edition, key, fields),
            );
    }
}

/**
 * Puts a whole section back to the baseline in one step: the template the edition started from, or the standard
 * game (B152). Name, language and theme are choices, not changes, so they stay. Parts that are switched off keep
 * what was made for them (B99).
 */
export function resetSection(
    edition: Edition,
    section: EditionSection,
): SettingsChange {
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
    } else if (section === 'parts') {
        // The amount of play money goes back to the default of each set (B156).
        const { moneyAmount: _, ...rest } = next;
        next = { ...rest, parts: { ...baselineOf(next).parts } };
    } else if (section === 'board') {
        next = { ...next, boardProfile: DEFAULT_BOARD_PROFILE };
    }

    return { edition: next, changes, summary: '' };
}

/** How many words of the Woorden section the edition changed, for the folded section on a phone. */
export function changedWords(edition: Edition): number {
    return SECTION_WORDS.filter((id) =>
        differsFromBaseline(edition, wordKey(id)),
    ).length;
}

/** The parts that are on, out of those that can be chosen, for "5 van 10". */
export function partCount(edition: Edition): { on: number; total: number } {
    const choosable = [...GAME_PARTS, ...EXTRA_PARTS];

    return {
        on: choosable.filter((part) => edition.parts[part]).length,
        total: choosable.length,
    };
}

/**
 * The element a contribution of a friend belongs to, to open from "Van vrienden" (B146): the element itself, or
 * for the town of a colour group its first street, where the town shows.
 */
export function contributionElement(key: string): string {
    return key.startsWith('group.') ? (firstStreetKey(key) ?? key) : key;
}

/** The first element with a contribution waiting, in the order they came in. */
export function firstContributionElement(
    contributions: readonly { elementKey: string }[],
): string | undefined {
    const first = contributions[0];

    return first === undefined
        ? undefined
        : contributionElement(first.elementKey);
}
