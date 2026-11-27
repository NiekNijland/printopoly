import type { CenterPlace } from '@/lib/render/center-layout';
import type { PatternId } from '@/lib/render/patterns';
import type { BoardProfile } from '@/lib/render/print-board';
import { standardEdition as defaultStandardEdition } from '@/lib/render/standard-edition';
import type {
    Card,
    Currency,
    DeckId,
    GroupId,
    Locale,
    Note,
    OwnableSpace,
    Space,
    StandardEdition,
} from '@/types/game';
import { BANK_KEY, RULES_BOOKLET_KEY, partOfKey } from './edition-keys';
import { partStylesOf, type PartStyles } from './edition-part-styles';
import {
    resolvedDeeds,
    resolvedGroups,
    resolvedNotes,
    resolvedPawns,
    resolvedSpaces,
} from './edition-resolve-board';
import { deckCards } from './edition-resolve-cards';
import {
    boxLid,
    cardBack,
    center,
    free,
    houseRules,
    invitation,
} from './edition-resolve-elements';
import type {
    CenterMode,
    Edition,
    FreeLayer,
    Parts,
    PhotoPlacement,
    PhotoStyle,
    SpaceIcon,
    ThemeId,
    TitleStyle,
} from './edition-types';
import {
    defaultWords,
    resolveWords,
    type ResolvedWords,
} from './edition-words';

export type ResolvedBase = {
    key: string;
    /** True when the element has an override. */
    customized: boolean;
    photo: PhotoPlacement | undefined;
    /** Framed or over the whole space; only meaningful with a photo. */
    photoStyle: PhotoStyle | undefined;
};

export type ResolvedSpace = {
    position: number;
    base: Space;
    name: string;
    /** Town of the colour group of a street; `undefined` when it is not set. */
    town: string | undefined;
    /** Short text on a corner (the salary line on Start, the label in the jail), or `undefined` for the standard one. */
    text: string | undefined;
    /** The chosen icon or uploaded image of a special space (B136); `undefined` keeps the standard icon. */
    icon: SpaceIcon | undefined;
} & ResolvedBase;

/** A colour group of the streets, with its optional town (shown above the street names). */
export type ResolvedGroup = {
    id: GroupId;
    key: string;
    color: string;
    /** Standard name of the group in the language of the edition. */
    name: string;
    customized: boolean;
    town: string | undefined;
};

export type ResolvedDeed = {
    /** 1 to 28, in board order. */
    index: number;
    space: OwnableSpace;
    name: string;
    town: string | undefined;
    /** Where the photo comes from (B157): the deed itself, the space, or `undefined` without one. */
    photoFrom: 'deed' | 'space' | undefined;
    /** The short story on the back of the deed (B169); `undefined` when it is empty. */
    story: string | undefined;
} & ResolvedBase;

export type ResolvedCard = {
    id: string;
    deck: DeckId;
    /** The standard card, or an empty one for an extra card (B135). */
    base: Card;
    /** An extra card the edition added after the standard 16 (B135); it can be taken out again. */
    extra: boolean;
    /** Original effect, shown as reference in the editor (B32). */
    effect: string;
    originalText: string;
    /** The text with its variables, as stored (B131). */
    template: string;
    /** The text as printed: variables filled in with the current names. */
    text: string;
    /** Amount of the card, signed (plus is received, minus is paid), within 20% of the standard one (B132). */
    amount: number | undefined;
    /** The standard amount of this card; `undefined` for a card without an amount. */
    standardAmount: number | undefined;
    /**
     * The amount of the line at the bottom of the card ("Pay 50"). `undefined` when the card has no amount, or when
     * its text holds the amount itself with the `{amount}` variable.
     */
    lineAmount: number | undefined;
    /** What the amount is for, trimmed; `undefined` when it is empty. */
    purpose: string | undefined;
} & ResolvedBase;

export type ResolvedNote = {
    value: number;
    count: number;
    /** Paper colour: the override, or the standard colour of this value. */
    color: string;
    /** Notes keep the standard amounts (B29). */
    note: Note;
} & ResolvedBase;

export type ResolvedPawn = {
    /** 1 to 8. Pawns taken out of the set are not in the list, so this is not the list position. */
    index: number;
    name: string;
} & ResolvedBase;

/** Board centre, box lid, house rules and card backs: free text and photos (B42, B43). */
export type ResolvedFree = {
    /** Built-in pattern of a card back. */
    pattern: PatternId | undefined;
    name: string | undefined;
    text: string | undefined;
    /**
     * The line under the name (board centre, box lid) or above the headline (invitation): `undefined` for the
     * standard line, `''` when it is switched off (B169).
     */
    subtitle: string | undefined;
    /** Where the title sits, from -1 (top) to 1 (bottom); 0 is the standard place (B170). */
    titleOffset: number;
    /** Box lid: the light band under the title on a photo over the whole lid (B170). */
    titleBand: boolean;
    /** Board centre and box lid: the look of the name; `undefined` is the name plate of the theme. */
    titleStyle: TitleStyle | undefined;
    layers: readonly FreeLayer[];
} & ResolvedBase;

/** The box lid: free text and a photo, or the logo of the board centre in the place of the board picture (B241). */
export type ResolvedLid = {
    /** The lid shows the logo of the board centre, whole and straight where the board picture goes (B241, B256). */
    logo: boolean;
} & ResolvedFree;

/** The board centre: free layers plus the edition title (B125). */
export type ResolvedCenter = {
    mode: CenterMode;
    /** Size of the title ribbon, from 0.5 to 1 (B170). */
    titleScale: number;
    /** The title ribbon is switched off (B170). */
    titleHidden: boolean;
    /** Width over height of the placed photo or logo, when the editor knew it. */
    photoAspect: number | undefined;
    /** Frame around the photo above the name (default on). */
    photoFrame: boolean;
    /** Photo over the whole centre (B125). */
    background: PhotoPlacement | undefined;
    /** Where the title, photo or logo sit (B187): a free square, or across the fold lines. */
    place: CenterPlace;
    /** The logo lies on the diagonal (B187); straight by default. */
    logoTilt: boolean;
} & ResolvedFree;

export type ResolvedEdition = {
    id: string;
    name: string;
    language: Locale;
    currency: Currency;
    theme: ThemeId;
    boardProfile: BoardProfile;
    /** The edition's own words for houses, hotels, the jail, the decks and the currency, on top of the standard ones. */
    words: ResolvedWords;
    /** Which parts are on. Parts that are off are `null` below; their overrides stay in the edition (B99). */
    parts: Parts;
    spaces: ResolvedSpace[];
    groups: ResolvedGroup[];
    boardCenter: ResolvedCenter;
    deeds: ResolvedDeed[] | null;
    deedBack: ResolvedFree | null;
    decks: { chance: ResolvedCard[]; chest: ResolvedCard[] } | null;
    cardBacks: { chance: ResolvedFree; chest: ResolvedFree } | null;
    money: {
        notes: ResolvedNote[];
        /** Name of the bank, printed on every note; `undefined` when it is not set. */
        bankName: string | undefined;
        startingCash: StandardEdition['money']['startingCash'];
    } | null;
    pawns: ResolvedPawn[] | null;
    boxLid: ResolvedLid | null;
    houseRules: ResolvedFree | null;
    /** The extra print items (B123): a cover photo and an invitation text. */
    rulesBooklet: ResolvedFree | null;
    invitation: ResolvedFree | null;
    /**
     * The style of each part that has one of its own (B268); a part that is absent follows the theme. The renderers
     * get it through `buildStyle` as `style.parts`.
     */
    partStyles: PartStyles;
    /** Total number of overrides in parts that are on. */
    customizedCount: number;
};

/** The icon of the first Chance or Community Chest space that has one: it goes on the standard back of that deck (B136). */
export const deckIcon = (
    resolved: Pick<ResolvedEdition, 'spaces'>,
    deck: DeckId,
): SpaceIcon | undefined => {
    return resolved.spaces.find(
        (space) => space.base.type === deck && space.icon !== undefined,
    )?.icon;
};

const standardCurrencyOf = (
    edition: Edition,
    standard: StandardEdition,
): Currency => {
    const standardCurrency = standard.currencies.find(
        (candidate) => candidate.id === edition.currency,
    );
    if (standardCurrency === undefined) {
        throw new RangeError(`Unknown currency ${edition.currency}`);
    }

    return standardCurrency;
};

/**
 * Merges the overrides of an edition onto the standard data, in the language of the edition. Parts that are off
 * resolve to `null` but keep their overrides in the edition, so they come back when the part is switched on (B99).
 */
export const resolveEdition = (
    edition: Edition,
    standard: StandardEdition = defaultStandardEdition,
): ResolvedEdition => {
    const { language, parts } = edition;
    const words = resolveWords(edition, standard);
    const standardWords = defaultWords(edition, standard);
    const currency: Currency = {
        ...standardCurrencyOf(edition, standard),
        symbol: words.currencySymbol,
        name: { nl: words.currencyName, en: words.currencyName },
    };

    const bankName = edition.elements[BANK_KEY]?.name;

    const resolved: ResolvedEdition = {
        id: edition.id,
        name: edition.name,
        language,
        currency,
        theme: edition.theme,
        boardProfile: edition.boardProfile,
        words,
        parts,
        spaces: resolvedSpaces(edition, standard, words),
        groups: resolvedGroups(edition, standard),
        boardCenter: center(edition),
        deeds: parts.deeds ? resolvedDeeds(edition, standard) : null,
        deedBack: parts.deeds ? cardBack(edition, 'deed') : null,
        decks: parts.cards
            ? {
                  chance: deckCards(
                      edition,
                      standard,
                      'chance',
                      words,
                      standardWords,
                  ),
                  chest: deckCards(
                      edition,
                      standard,
                      'chest',
                      words,
                      standardWords,
                  ),
              }
            : null,
        cardBacks: parts.cards
            ? {
                  chance: cardBack(edition, 'chance'),
                  chest: cardBack(edition, 'chest'),
              }
            : null,
        money: parts.money
            ? {
                  notes: resolvedNotes(edition, standard),
                  bankName: bankName === '' ? undefined : bankName,
                  startingCash: standard.money.startingCash,
              }
            : null,
        pawns: parts.pawns ? resolvedPawns(edition) : null,
        boxLid: parts.boxLid ? boxLid(edition) : null,
        houseRules: parts.houseRules ? houseRules(edition, words) : null,
        rulesBooklet: parts.rulesBooklet
            ? free(edition, RULES_BOOKLET_KEY)
            : null,
        invitation: parts.invitation ? invitation(edition) : null,
        partStyles: partStylesOf(edition.elements),
        customizedCount: 0,
    };

    resolved.customizedCount = countCustomized(edition);

    return resolved;
};

/** Overrides in parts that are switched on. */
export const countCustomized = (edition: Edition): number => {
    return Object.keys(edition.elements).filter((key) =>
        isKeyActive(edition, key),
    ).length;
};

const isKeyActive = (edition: Edition, key: string): boolean => {
    const part = partOfKey(key);

    return part !== null && edition.parts[part];
};

/** The resolved card of a key like `card.chance.07`, standard or extra (B135); `undefined` when there is none. */
export const resolvedCardOf = (
    resolved: Pick<ResolvedEdition, 'decks'>,
    key: string,
): ResolvedCard | undefined => {
    const deck = key.split('.')[1];
    if (deck !== 'chance' && deck !== 'chest') {
        return undefined;
    }

    return resolved.decks?.[deck].find(
        (candidate) => `card.${candidate.id}` === key,
    );
};
