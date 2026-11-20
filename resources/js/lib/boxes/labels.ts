import type { Edition } from '@/lib/edition/types';
import { elementLabel } from '@/lib/editor/catalogue';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';

/** The colour group a `group.<colour>` key stands for. */
export function groupOf(key: string) {
    const id = /^group\.([a-z_]+)$/.exec(key)?.[1];

    return standardEdition.groups.find((group) => group.id === id);
}

/** The first street of a colour group: the space that shows its town, for previews. */
export function firstStreetKey(key: string): string | undefined {
    const group = groupOf(key);
    const street = standardEdition.spaces.find(
        (space) => space.type === 'street' && space.group === group?.id,
    );

    return street === undefined
        ? undefined
        : `space.${String(street.position).padStart(2, '0')}`;
}

/**
 * What a contribution is for, in words: the name of a space, "Kans 3", "Pion 2", or for the town of a colour group
 * the name of the group. `groupWord` is the translated "Town for :group".
 */
export function targetLabel(
    key: string,
    edition: Edition,
    locale: Locale,
    groupWord: (group: string) => string,
): string {
    const group = groupOf(key);

    return group === undefined
        ? elementLabel(key, edition, locale)
        : groupWord(group.name[locale]);
}
