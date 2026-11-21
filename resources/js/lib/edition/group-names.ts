import { standardEdition } from '@/lib/game/standard-edition';
import type { GroupId, Locale } from '@/lib/game/types';
import { colorName, type ColorName } from '@/lib/render/color-names';
import { THEMES } from '@/lib/render/themes';

import { groupKey } from './keys';
import type { Edition } from './types';

/**
 * The colour a group is printed in: the edition's own colour, else the colour of the theme, else the standard
 * colour. The board, the deeds and every label use this one (bug 27).
 */
export function groupColor(
    edition: Pick<Edition, 'theme' | 'elements'>,
    group: GroupId,
): string {
    return (
        edition.elements[groupKey(group)]?.color ??
        THEMES[edition.theme].groupColors?.[group] ??
        standardEdition.groups.find((candidate) => candidate.id === group)
            ?.color ??
        '#000000'
    );
}

/**
 * The name of a group after the colour it really has, in lower case: the brown group is "paars" in Riso, and a
 * group someone made grey is "grijs" (bug 27). A group in its standard colour keeps its standard name.
 */
export function groupColorName(
    edition: Pick<Edition, 'theme' | 'elements'>,
    group: GroupId,
    locale: Locale,
): ColorName {
    return colorName(groupColor(edition, group), locale);
}

/** The group name with a capital, as in a list: "Paars". */
export function groupTitle(
    edition: Pick<Edition, 'theme' | 'elements'>,
    group: GroupId,
    locale: Locale,
): string {
    const { name } = groupColorName(edition, group, locale);

    return name.charAt(0).toUpperCase() + name.slice(1);
}
