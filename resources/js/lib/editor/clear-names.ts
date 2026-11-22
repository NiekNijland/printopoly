import { fieldDiffers } from '@/lib/edition/baseline';
import { setElement } from '@/lib/edition/changes';
import { NAMED_SPACE_KEYS, deckCardKeys } from '@/lib/edition/keys';
import {
    EMPTY_TEMPLATE,
    type Edition,
    type ElementChange,
} from '@/lib/edition/types';

const NAMED = new Set(NAMED_SPACE_KEYS);

/** Whether this element is a street, station or utility, the spaces "Namen leegmaken" empties. */
export function isNamedSpaceKey(key: string): boolean {
    return NAMED.has(key);
}

/** A space whose name was cleared: it prints without a name until the owner writes one. */
function hasEmptyName(edition: Edition, key: string): boolean {
    return edition.elements[key]?.name?.trim() === '';
}

/** A name the owner typed: it differs from the template or the standard game, and is not empty. */
function hasOwnName(edition: Edition, key: string): boolean {
    return !hasEmptyName(edition, key) && fieldDiffers(edition, key, 'name');
}

/**
 * Whether "Namen leegmaken" would change anything: some street, station or utility still has the name of the
 * template or the standard game.
 */
export function canClearNames(edition: Edition): boolean {
    return NAMED_SPACE_KEYS.some(
        (key) => !hasEmptyName(edition, key) && !hasOwnName(edition, key),
    );
}

/** The streets, stations and utilities with a name the owner typed: "Namen leegmaken" leaves them (B258). */
export function ownNameKeys(edition: Edition): string[] {
    return NAMED_SPACE_KEYS.filter((key) => hasOwnName(edition, key));
}

/**
 * Every street, station and utility with the name of the template or the standard game gets an empty name, so the
 * owner writes the board from scratch. A name the owner typed stays (B258, R6 Sara: it wiped the names she had
 * just typed). Photos, icons, prices and the rest stay. The changes go in together, as one undo step.
 */
export function clearNamesChanges(edition: Edition): ElementChange[] {
    const changes: ElementChange[] = [];
    let current = edition;
    for (const key of NAMED_SPACE_KEYS) {
        if (hasEmptyName(current, key) || hasOwnName(current, key)) {
            continue;
        }
        const result = setElement(current, key, {
            ...current.elements[key],
            name: '',
        });
        current = result.edition;
        if (result.change !== null) {
            changes.push(result.change);
        }
    }

    return changes;
}

/** The keys of the streets, stations and utilities without a name, for Controle. */
export function emptyNameKeys(edition: Edition): string[] {
    return NAMED_SPACE_KEYS.filter((key) => hasEmptyName(edition, key));
}

/**
 * The start Leeg in Nieuwe editie (B259): the standard edition with no name on any street, station or utility and
 * no text on any Chance or Community Chest card, to fill in yourself or with a pen.
 */
export function emptiedEdition(edition: Edition): Edition {
    // Leeg is its own baseline, so an untouched Leeg edition shows no change dots.
    let current: Edition = { ...edition, template: EMPTY_TEMPLATE };
    for (const key of NAMED_SPACE_KEYS) {
        current = setElement(current, key, {
            ...current.elements[key],
            name: '',
        }).edition;
    }
    for (const deck of ['chance', 'chest'] as const) {
        for (const key of deckCardKeys(current.elements, deck)) {
            current = setElement(current, key, {
                ...current.elements[key],
                text: '',
            }).edition;
        }
    }

    return current;
}

/** What "Namen leegmaken" says when it is done, with the names you typed that stayed (B258). */
export function clearNamesDone(
    t: (key: string, replacements?: Record<string, string | number>) => string,
    kept: number,
): string {
    return kept === 0
        ? t('editor.clear_names_done')
        : t(
              kept === 1
                  ? 'editor.clear_names_done_kept_one'
                  : 'editor.clear_names_done_kept',
              { count: kept },
          );
}
