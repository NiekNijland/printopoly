import { isOwnable } from '@/lib/render/standard-edition';
import type { OwnableSpace, StandardEdition } from '@/types/game';
import { applyAmounts } from './edition-amounts';
import { deedPhotoOf } from './edition-deed-photos';
import { groupColor, groupTitle } from './edition-group-names';
import {
    GROUP_IDS,
    PAWN_COUNT,
    deedKey,
    groupKey,
    noteKey,
    pawnKey,
    spaceKey,
} from './edition-keys';
import type {
    ResolvedDeed,
    ResolvedGroup,
    ResolvedNote,
    ResolvedPawn,
    ResolvedSpace,
} from './edition-resolve';
import { base, textOrUndefined, townOf } from './edition-resolve-elements';
import { messages } from './edition-strings';
import type { Edition } from './edition-types';
import type { ResolvedWords } from './edition-words';

export const resolvedGroups = (
    edition: Edition,
    standard: StandardEdition,
): ResolvedGroup[] => {
    const { language } = edition;

    return GROUP_IDS.flatMap((id) => {
        const group = standard.groups.find((candidate) => candidate.id === id);

        return group === undefined
            ? []
            : [
                  {
                      id,
                      key: groupKey(id),
                      // The colour it is printed in: its own, else the theme's, else the standard (bug 32).
                      color: groupColor(edition, id),
                      // Named after the colour it is printed in: the brown group is purple in Riso (bug 27).
                      name: groupTitle(edition, id, language),
                      customized: edition.elements[groupKey(id)] !== undefined,
                      town: townOf(edition, id),
                  },
              ];
    });
};

export const resolvedSpaces = (
    edition: Edition,
    standard: StandardEdition,
    words: ResolvedWords,
): ResolvedSpace[] => {
    const { language } = edition;

    return standard.spaces.map((space) => {
        const key = spaceKey(space.position);

        return {
            ...base(edition, key),
            position: space.position,
            base: applyAmounts(space, edition.elements[key]?.amounts),
            name:
                edition.elements[key]?.name ??
                (space.type === 'chance' || space.type === 'chest'
                    ? words.decks[space.type]
                    : space.name[language]),
            icon:
                space.type === 'street'
                    ? undefined
                    : edition.elements[key]?.icon,
            text:
                space.type === 'corner'
                    ? textOrUndefined(edition.elements[key]?.text)
                    : undefined,
            town:
                space.type === 'street'
                    ? townOf(edition, space.group)
                    : undefined,
        };
    });
};

export const resolvedDeeds = (
    edition: Edition,
    standard: StandardEdition,
): ResolvedDeed[] => {
    const { language } = edition;
    const ownables = standard.spaces.filter(
        (space): space is OwnableSpace =>
            space.type === 'street' ||
            space.type === 'station' ||
            space.type === 'utility',
    );

    return ownables.map((standardSpace, index) => {
        const key = deedKey(index + 1);
        const amended = applyAmounts(
            standardSpace,
            edition.elements[spaceKey(standardSpace.position)]?.amounts,
        );
        const space = isOwnable(amended) ? amended : standardSpace;
        const spaceName =
            edition.elements[spaceKey(space.position)]?.name ??
            space.name[language];
        const photo = deedPhotoOf(edition, index + 1);

        return {
            ...base(edition, key),
            photo: photo?.photo,
            photoStyle: photo?.photoStyle,
            photoFrom: photo?.from,
            index: index + 1,
            space,
            name: edition.elements[key]?.name ?? spaceName,
            town:
                space.type === 'street'
                    ? townOf(edition, space.group)
                    : undefined,
            story: textOrUndefined(edition.elements[key]?.text)?.trim(),
        };
    });
};

export const resolvedNotes = (
    edition: Edition,
    standard: StandardEdition,
): ResolvedNote[] => {
    return standard.money.notes.map((note) => ({
        ...base(edition, noteKey(note.value)),
        value: note.value,
        count: note.count,
        color: edition.elements[noteKey(note.value)]?.color ?? note.color,
        note,
    }));
};

export const resolvedPawns = (edition: Edition): ResolvedPawn[] => {
    return Array.from({ length: PAWN_COUNT }, (_, i) => {
        const key = pawnKey(i + 1);

        return {
            ...base(edition, key),
            index: i + 1,
            name:
                edition.elements[key]?.name ??
                messages[edition.language].pawnName(i + 1),
        };
    }).filter((pawn) => edition.elements[pawn.key]?.hidden !== true);
};
