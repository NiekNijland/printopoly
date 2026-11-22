import { setElement } from '@/lib/edition/changes';
import { spaceKey } from '@/lib/edition/keys';
import type { Edition, ElementChange } from '@/lib/edition/types';
import { standardEdition } from '@/lib/game/standard-edition';

/**
 * "Namen leegmaken" (B201): the safety net next to "Kaarten leegmaken" (B194) for a template whose street names do
 * not fit. It works on the spaces a template names: the streets, the stations and the utilities.
 */
export const NAMED_SPACE_KEYS: readonly string[] = standardEdition.spaces
    .filter((space) => ['street', 'station', 'utility'].includes(space.type))
    .map((space) => spaceKey(space.position));

const NAMED = new Set(NAMED_SPACE_KEYS);

/** Whether this element is a street, station or utility, the spaces "Namen leegmaken" empties. */
export function isNamedSpaceKey(key: string): boolean {
    return NAMED.has(key);
}

/** A space whose name was cleared: it prints without a name until the owner writes one. */
export function hasEmptyName(edition: Edition, key: string): boolean {
    return edition.elements[key]?.name?.trim() === '';
}

/** Whether "Namen leegmaken" would change anything: some street, station or utility still has a name. */
export function canClearNames(edition: Edition): boolean {
    return NAMED_SPACE_KEYS.some((key) => !hasEmptyName(edition, key));
}

/**
 * Every street, station and utility gets an empty name, so the owner writes the board from scratch. Photos, icons,
 * prices and the rest stay. The changes go in together, as one undo step.
 */
export function clearNamesChanges(edition: Edition): ElementChange[] {
    const changes: ElementChange[] = [];
    let current = edition;
    for (const key of NAMED_SPACE_KEYS) {
        if (hasEmptyName(current, key)) {
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
