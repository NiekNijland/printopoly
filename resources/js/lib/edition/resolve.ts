import {
    standardEdition as defaultStandardEdition,
    withCurrency,
} from '@/lib/game/standard-edition';
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
} from '@/lib/game/types';
import type { BoardProfile } from '@/lib/print/board';
import {
    BANK_KEY,
    BOARD_CENTER_KEY,
    BOX_LID_KEY,
    HOUSE_RULES_KEY,
    PAWN_COUNT,
    cardBackKey,
    cardKey,
    GROUP_IDS,
    deedKey,
    groupKey,
    noteKey,
    partOfKey,
    pawnKey,
    spaceKey,
} from './keys';
import { messages } from './strings';
import type {
    CenterMode,
    Edition,
    FreeLayer,
    Parts,
    PhotoPlacement,
    PhotoStyle,
    ThemeId,
} from './types';
import {
    defaultWords,
    fillWords,
    resolveWords,
    type ResolvedWords,
} from './words';

interface ResolvedBase {
    key: string;
    /** True when the element has an override. */
    customized: boolean;
    photo: PhotoPlacement | undefined;
    /** Framed or over the whole space; only meaningful with a photo. */
    photoStyle: PhotoStyle | undefined;
}

export interface ResolvedSpace extends ResolvedBase {
    position: number;
    base: Space;
    name: string;
    /** Town of the colour group of a street; `undefined` when it is not set. */
    town: string | undefined;
    /** Short text on a corner (the salary line on Start, the label in the jail), or `undefined` for the standard one. */
    text: string | undefined;
}

/** A colour group of the streets, with its optional town (shown above the street names). */
export interface ResolvedGroup {
    id: GroupId;
    key: string;
    color: string;
    /** Standard name of the group in the language of the edition. */
    name: string;
    customized: boolean;
    town: string | undefined;
}

export interface ResolvedDeed extends ResolvedBase {
    /** 1 to 28, in board order. */
    index: number;
    space: OwnableSpace;
    name: string;
    town: string | undefined;
}

export interface ResolvedCard extends ResolvedBase {
    id: string;
    deck: DeckId;
    /** Original effect, shown as reference in the editor (B32). */
    effect: string;
    originalText: string;
    text: string;
    amount: number | undefined;
}

export interface ResolvedNote extends ResolvedBase {
    value: number;
    count: number;
    /** Paper colour: the override, or the standard colour of this value. */
    color: string;
    /** Notes keep the standard amounts (B29). */
    note: Note;
}

export interface ResolvedPawn extends ResolvedBase {
    /** 1 to 8. Pawns taken out of the set are not in the list, so this is not the list position. */
    index: number;
    name: string;
}

/** Board centre, box lid, house rules and card backs: free text and photos (B42, B43). */
export interface ResolvedFree extends ResolvedBase {
    name: string | undefined;
    text: string | undefined;
    layers: readonly FreeLayer[];
}

/** The board centre: free layers plus the edition title (B125). */
export interface ResolvedCenter extends ResolvedFree {
    mode: CenterMode;
    /** Line under the name: `undefined` for the standard tagline, `''` when it is switched off. */
    subtitle: string | undefined;
    /** Width over height of the placed photo or logo, when the editor knew it. */
    photoAspect: number | undefined;
    /** Frame around the photo above the name (default on). */
    photoFrame: boolean;
    /** Photo over the whole centre (B125). */
    background: PhotoPlacement | undefined;
}

export interface ResolvedEdition {
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
    boxLid: ResolvedFree | null;
    houseRules: ResolvedFree | null;
    /** Total number of overrides in parts that are on. */
    customizedCount: number;
}

function base(edition: Edition, key: string): ResolvedBase {
    const override = edition.elements[key];

    return {
        key,
        customized: override !== undefined,
        photo: override?.photo,
        photoStyle: override?.photoStyle,
    };
}

function textOrUndefined(value: string | undefined): string | undefined {
    return value === undefined || value.trim() === '' ? undefined : value;
}

function free(edition: Edition, key: string): ResolvedFree {
    const override = edition.elements[key];

    return {
        ...base(edition, key),
        name: override?.name,
        text: override?.text,
        layers: override?.layers ?? [],
    };
}

/** The town of a colour group: trimmed, and `undefined` when it is empty. */
function townOf(edition: Edition, group: GroupId): string | undefined {
    const town = edition.elements[groupKey(group)]?.town?.trim();

    return town === undefined || town === '' ? undefined : town;
}

function center(edition: Edition): ResolvedCenter {
    const override = edition.elements[BOARD_CENTER_KEY];

    return {
        ...free(edition, BOARD_CENTER_KEY),
        mode: override?.centerMode ?? 'name',
        subtitle: override?.subtitle,
        photoAspect: override?.photoAspect,
        photoFrame: override?.photoFrame ?? true,
        background: override?.background,
    };
}

/** Standard card texts name spaces; a renamed space is named by its new name in them. */
function renameSpaces(edition: Edition, text: string): string {
    const language = edition.language;
    const renames = defaultStandardEdition.spaces
        .map((space) => ({
            from: space.name[language],
            to: edition.elements[spaceKey(space.position)]?.name?.trim(),
        }))
        .filter(
            (rename): rename is { from: string; to: string } =>
                rename.to !== undefined &&
                rename.to !== '' &&
                rename.to !== rename.from,
        )
        .sort((a, b) => b.from.length - a.from.length);
    let result = text;

    // Two passes through placeholders, so a new name is never renamed again.
    renames.forEach((rename, i) => {
        if (result.includes(rename.from)) {
            result = result.split(rename.from).join(`\uE000${i}\uE000`);
        }
    });

    return result.replace(
        /\uE000(\d+)\uE000/g,
        (_, i: string) => renames[Number(i)]?.to ?? '',
    );
}

function resolveCard(
    edition: Edition,
    deck: DeckId,
    card: Card,
    index: number,
    words: ResolvedWords,
    standardWords: ResolvedWords,
): ResolvedCard {
    const key = cardKey(deck, index + 1);
    const override = edition.elements[key];
    const language = edition.language;

    // The standard texts follow the edition: renamed spaces, and the currency sign before every amount.
    const standard = (text: string, symbol?: string): string =>
        withCurrency(
            renameSpaces(edition, text),
            edition.currency,
            language,
            symbol,
        );

    return {
        ...base(edition, key),
        id: card.id,
        deck,
        effect: standard(card.effect[language], words.customSymbol),
        originalText: standard(
            fillWords(card.text[language], standardWords),
            standardWords.customSymbol,
        ),
        text:
            override?.text ??
            standard(
                fillWords(card.text[language], words),
                words.customSymbol,
            ),
        amount: override?.amount,
    };
}

/**
 * Merges the overrides of an edition onto the standard data, in the language of the edition. Parts that are off
 * resolve to `null` but keep their overrides in the edition, so they come back when the part is switched on (B99).
 */
export function resolveEdition(
    edition: Edition,
    standard: StandardEdition = defaultStandardEdition,
): ResolvedEdition {
    const { language, parts } = edition;
    const words = resolveWords(edition, standard);
    const standardWords = defaultWords(edition, standard);

    const groups: ResolvedGroup[] = GROUP_IDS.flatMap((id) => {
        const group = standard.groups.find((candidate) => candidate.id === id);

        return group === undefined
            ? []
            : [
                  {
                      id,
                      key: groupKey(id),
                      color: group.color,
                      name: group.name[language],
                      customized: edition.elements[groupKey(id)] !== undefined,
                      town: townOf(edition, id),
                  },
              ];
    });

    const spaces: ResolvedSpace[] = standard.spaces.map((space) => {
        const key = spaceKey(space.position);

        return {
            ...base(edition, key),
            position: space.position,
            base: space,
            name:
                edition.elements[key]?.name ??
                (space.type === 'chance' || space.type === 'chest'
                    ? words.decks[space.type]
                    : space.name[language]),
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

    const ownables = standard.spaces.filter(
        (space): space is OwnableSpace =>
            space.type === 'street' ||
            space.type === 'station' ||
            space.type === 'utility',
    );
    const deeds: ResolvedDeed[] = ownables.map((space, index) => {
        const key = deedKey(index + 1);
        const spaceName =
            edition.elements[spaceKey(space.position)]?.name ??
            space.name[language];

        return {
            ...base(edition, key),
            index: index + 1,
            space,
            name: edition.elements[key]?.name ?? spaceName,
            town:
                space.type === 'street'
                    ? townOf(edition, space.group)
                    : undefined,
        };
    });

    const notes: ResolvedNote[] = standard.money.notes.map((note) => ({
        ...base(edition, noteKey(note.value)),
        value: note.value,
        count: note.count,
        color: edition.elements[noteKey(note.value)]?.color ?? note.color,
        note,
    }));

    const pawns: ResolvedPawn[] = Array.from({ length: PAWN_COUNT }, (_, i) => {
        const key = pawnKey(i + 1);

        return {
            ...base(edition, key),
            index: i + 1,
            name:
                edition.elements[key]?.name ??
                messages[language].pawnName(i + 1),
        };
    }).filter((pawn) => edition.elements[pawn.key]?.hidden !== true);

    const standardCurrency = standard.currencies.find(
        (candidate) => candidate.id === edition.currency,
    );
    if (standardCurrency === undefined) {
        throw new RangeError(`Unknown currency ${edition.currency}`);
    }
    const currency: Currency = {
        ...standardCurrency,
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
        spaces,
        groups,
        boardCenter: center(edition),
        deeds: parts.deeds ? deeds : null,
        deedBack: parts.deeds ? free(edition, cardBackKey('deed')) : null,
        decks: parts.cards
            ? {
                  chance: standard.decks.chance.map((card, i) =>
                      resolveCard(
                          edition,
                          'chance',
                          card,
                          i,
                          words,
                          standardWords,
                      ),
                  ),
                  chest: standard.decks.chest.map((card, i) =>
                      resolveCard(
                          edition,
                          'chest',
                          card,
                          i,
                          words,
                          standardWords,
                      ),
                  ),
              }
            : null,
        cardBacks: parts.cards
            ? {
                  chance: free(edition, cardBackKey('chance')),
                  chest: free(edition, cardBackKey('chest')),
              }
            : null,
        money: parts.money
            ? {
                  notes,
                  bankName: bankName === '' ? undefined : bankName,
                  startingCash: standard.money.startingCash,
              }
            : null,
        pawns: parts.pawns ? pawns : null,
        boxLid: parts.boxLid ? free(edition, BOX_LID_KEY) : null,
        houseRules: parts.houseRules ? free(edition, HOUSE_RULES_KEY) : null,
        customizedCount: 0,
    };

    resolved.customizedCount = countCustomized(edition);

    return resolved;
}

/** Overrides in parts that are switched on. */
export function countCustomized(edition: Edition): number {
    return Object.keys(edition.elements).filter((key) =>
        isKeyActive(edition, key),
    ).length;
}

function isKeyActive(edition: Edition, key: string): boolean {
    const part = partOfKey(key);

    return part !== null && edition.parts[part];
}
