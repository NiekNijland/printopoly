import { templateInvitation } from '@/lib/render/edition-templates';
import type { GroupId } from '@/types/game';
import { templateOf } from './edition-baseline';
import { cardTextContext, renderCardText } from './edition-card-text';
import {
    BOARD_CENTER_KEY,
    BOX_LID_KEY,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    cardBackKey,
    groupKey,
} from './edition-keys';
import type {
    ResolvedBase,
    ResolvedCenter,
    ResolvedFree,
    ResolvedLid,
} from './edition-resolve';
import type { Edition } from './edition-types';
import type { ResolvedWords } from './edition-words';

export const base = (edition: Edition, key: string): ResolvedBase => {
    const override = edition.elements[key];

    return {
        key,
        customized: override !== undefined,
        photo: override?.photo,
        photoStyle: override?.photoStyle,
    };
};

export const textOrUndefined = (
    value: string | undefined,
): string | undefined => {
    return value === undefined || value.trim() === '' ? undefined : value;
};

export const free = (edition: Edition, key: string): ResolvedFree => {
    const override = edition.elements[key];

    return {
        ...base(edition, key),
        pattern: override?.pattern,
        name: override?.name,
        text: override?.text,
        subtitle: override?.subtitle,
        titleOffset: override?.titleOffset ?? 0,
        titleBand: override?.titleBand !== false,
        titleStyle: override?.titleStyle,
        layers: override?.layers ?? [],
    };
};

/**
 * The box lid: without a subtitle of its own it takes the board's own subtitle (B254, Kees: "Ons dorp in de jaren
 * vijftig" on the board, "Een spel voor 2 tot 8 spelers" on the box). An empty one stays empty: that hides it.
 */
export const boxLid = (edition: Edition): ResolvedLid => {
    const own = free(edition, BOX_LID_KEY);
    const board = textOrUndefined(edition.elements[BOARD_CENTER_KEY]?.subtitle);
    const logo = lidShowsLogo(edition);

    return own.subtitle === undefined && board !== undefined
        ? { ...own, subtitle: board, logo }
        : { ...own, logo };
};

/**
 * Whether the box lid shows the logo of the board centre (B241): the centre is on Logo and the lid has the same
 * photo. The lid then draws it in the place of the board picture (B256), whole and straight.
 */
export const lidShowsLogo = (edition: Edition): boolean => {
    const center = edition.elements[BOARD_CENTER_KEY];
    const lid = edition.elements[BOX_LID_KEY];

    return (
        center?.centerMode === 'logo' &&
        center.photo !== undefined &&
        lid?.photo !== undefined &&
        lid.photo.photoId === center.photo.photoId
    );
};

/** The back of a deck: a photo or a pattern; free layers stored before B203 are left out. */
export const cardBack = (
    edition: Edition,
    deck: 'chance' | 'chest' | 'deed',
): ResolvedFree => {
    return { ...free(edition, cardBackKey(deck)), layers: [] };
};

/**
 * The invitation: a headline and kicker its owner did not write come from the template, so a wedding says
 * "Bruiloft" above the headline and a kids' party asks "Kom je op mijn feestje?" (B193). Without them the card
 * has its general words.
 */
export const invitation = (edition: Edition): ResolvedFree => {
    const own = free(edition, INVITATION_KEY);
    const fromTemplate = templateInvitation(
        templateOf(edition),
        edition.language,
    );

    return {
        ...own,
        name: own.name ?? fromTemplate.headline,
        subtitle: own.subtitle ?? fromTemplate.kicker,
    };
};

/** The house rules with their tokens filled in: a rule that names Start follows a renamed Start (B152). */
export const houseRules = (
    edition: Edition,
    words: ResolvedWords,
): ResolvedFree => {
    const rules = free(edition, HOUSE_RULES_KEY);

    return rules.text === undefined
        ? rules
        : {
              ...rules,
              text: renderCardText(
                  rules.text,
                  cardTextContext(
                      edition,
                      undefined,
                      words.customSymbol,
                      words,
                  ),
              ),
          };
};

/** The town of a colour group: trimmed, and `undefined` when it is empty. */
export const townOf = (
    edition: Edition,
    group: GroupId,
): string | undefined => {
    const town = edition.elements[groupKey(group)]?.town?.trim();

    return town === undefined || town === '' ? undefined : town;
};

export const center = (edition: Edition): ResolvedCenter => {
    const override = edition.elements[BOARD_CENTER_KEY];

    return {
        ...free(edition, BOARD_CENTER_KEY),
        mode: override?.centerMode ?? 'name',
        titleScale: override?.titleScale ?? 1,
        titleHidden: override?.titleHidden === true,
        photoAspect: override?.photoAspect,
        photoFrame: override?.photoFrame ?? true,
        background: override?.background,
        place: override?.centerPlace ?? 'topRight',
        logoTilt: override?.logoTilt === true,
    };
};
