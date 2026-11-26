import { groupColorName } from '@/lib/render/edition-group-names';
import type { Edition } from '@/lib/render/edition-types';
import { elementLabel } from '@/lib/render/editor-catalogue';
import { standardEdition } from '@/lib/render/standard-edition';
import type { Locale } from '@/types/game';

/** The colour group a `group.<colour>` key stands for. */
export const groupOf = (key: string) => {
    const id = /^group\.([a-z_]+)$/.exec(key)?.[1];

    return standardEdition.groups.find((group) => group.id === id);
};

/** The first street of a colour group: the space that shows its town, for previews. */
export const firstStreetKey = (key: string): string | undefined => {
    const group = groupOf(key);
    const street = standardEdition.spaces.find(
        (space) => space.type === 'street' && space.group === group?.id,
    );

    return street === undefined
        ? undefined
        : `space.${String(street.position).padStart(2, '0')}`;
};

/**
 * What a contribution is for, in words: the name of a space, "Kans 3", "Pion 2", or for the town of a colour group
 * the name of the group. `groupWord` is the translated "Town for :group".
 */
export const targetLabel = (
    key: string,
    edition: Edition,
    locale: Locale,
    groupWord: (group: string) => string,
): string => {
    const group = groupOf(key);

    return group === undefined
        ? elementLabel(key, edition, locale)
        : groupWord(groupColorName(edition, group.id, locale).name);
};

/** The kinds of spaces that show a photo and their own name; the same list as BoxTargets on the server (B175). */
const FRIEND_SPACE_TYPES: ReadonlySet<string> = new Set([
    'street',
    'station',
    'utility',
    'corner',
]);

/**
 * Whether a friend can add to a space: only to one that shows a photo and its own name (bug 18). Kans, Algemeen
 * Fonds and the tax spaces do not, so the server refuses them too. Other keys (cards, pawns, towns) are not spaces.
 */
export const friendCanAddToSpace = (key: string): boolean => {
    const position = /^space\.(\d{2})$/.exec(key)?.[1];
    if (position === undefined) {
        return true;
    }
    const space = standardEdition.spaces.find(
        (candidate) => candidate.position === Number(position),
    );

    return space !== undefined && FRIEND_SPACE_TYPES.has(space.type);
};
