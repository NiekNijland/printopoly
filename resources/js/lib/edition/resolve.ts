import { templateInvitation } from '@/data/templates';
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
import type { CenterPlace } from '@/lib/render/center-layout';
import type { PatternId } from '@/lib/render/patterns';
import {
    applyAmounts,
    isExtraCardAmountAllowed,
    resolveCardAmount,
} from './amounts';
import { templateOf } from './baseline';
import {
    cardTextContext,
    mapCardTextSegments,
    parseCardText,
    renderCardText,
} from './card-text';
import { deedPhotoOf } from './deed-photos';
import { groupColor, groupTitle } from './group-names';
import {
    BANK_KEY,
    BOARD_CENTER_KEY,
    BOX_LID_KEY,
    DICE_KEY,
    FOLD_MODELS_KEY,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    RULES_BOOKLET_KEY,
    PAWN_COUNT,
    cardBackKey,
    cardKey,
    extraCardKeys,
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
    SpaceIcon,
    ThemeId,
} from './types';
import { defaultWords, resolveWords, type ResolvedWords } from './words';

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
    /** The chosen icon or uploaded image of a special space (B136); `undefined` keeps the standard icon. */
    icon: SpaceIcon | undefined;
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
    /** Where the photo comes from (B157): the deed itself, the space, or `undefined` without one. */
    photoFrom: 'deed' | 'space' | undefined;
    /** The short story on the back of the deed (B169); `undefined` when it is empty. */
    story: string | undefined;
}

export interface ResolvedCard extends ResolvedBase {
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
    layers: readonly FreeLayer[];
}

/** The board centre: free layers plus the edition title (B125). */
export interface ResolvedCenter extends ResolvedFree {
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
    /** The extra print items (B123): a cover photo, an emblem, a photo on the dice, an invitation text. */
    rulesBooklet: ResolvedFree | null;
    foldModels: ResolvedFree | null;
    dice: ResolvedFree | null;
    invitation: ResolvedFree | null;
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
        pattern: override?.pattern,
        name: override?.name,
        text: override?.text,
        subtitle: override?.subtitle,
        titleOffset: override?.titleOffset ?? 0,
        titleBand: override?.titleBand !== false,
        layers: override?.layers ?? [],
    };
}

/** The back of a deck: a photo or a pattern; free layers stored before B203 are left out. */
function cardBack(
    edition: Edition,
    deck: 'chance' | 'chest' | 'deed',
): ResolvedFree {
    return { ...free(edition, cardBackKey(deck)), layers: [] };
}

/**
 * The invitation: a headline and kicker its owner did not write come from the template, so a wedding says
 * "Bruiloft" above the headline and a kids' party asks "Kom je op mijn feestje?" (B193). Without them the card
 * has its general words.
 */
function invitation(edition: Edition): ResolvedFree {
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
}

/** The house rules with their tokens filled in: a rule that names Start follows a renamed Start (B152). */
function houseRules(edition: Edition, words: ResolvedWords): ResolvedFree {
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
        titleScale: override?.titleScale ?? 1,
        titleHidden: override?.titleHidden === true,
        photoAspect: override?.photoAspect,
        photoFrame: override?.photoFrame ?? true,
        background: override?.background,
        place: override?.centerPlace ?? 'topRight',
        logoTilt: override?.logoTilt === true,
    };
}

/** The salary for passing Start: the standard one and the one of the edition (B132). */
function salaryOf(
    edition: Edition,
    standard: StandardEdition,
): { standard: number; own: number } {
    const start = standard.spaces[0];
    const fallback = 200;
    if (start?.type !== 'corner' || start.salary === undefined) {
        return { standard: fallback, own: fallback };
    }
    const own = applyAmounts(start, edition.elements[spaceKey(0)]?.amounts);

    return {
        standard: start.salary,
        own:
            own.type === 'corner' ? (own.salary ?? start.salary) : start.salary,
    };
}

function resolveCard(
    edition: Edition,
    standard: StandardEdition,
    deck: DeckId,
    card: Card,
    index: number,
    words: ResolvedWords,
    standardWords: ResolvedWords,
): ResolvedCard {
    const key = cardKey(deck, index + 1);
    const override = edition.elements[key];
    const language = edition.language;
    const extra = override?.added === true;
    // An extra card has a free amount and no standard one (B135).
    const amount = extra
        ? override.amount !== undefined &&
          isExtraCardAmountAllowed(override.amount)
            ? override.amount
            : undefined
        : resolveCardAmount(card, override?.amount);
    const purpose = override?.purpose?.trim();

    // The standard texts follow the edition: renamed spaces, its own words and the currency sign before every
    // amount. The currency sign goes before the amounts in the plain text around the tokens (`{space:N}`,
    // `{currency}`, `{amount}`, `{station}` and the other words), which resolve to current values (B177).
    const standardTemplate = (text: string, w: ResolvedWords): string =>
        mapCardTextSegments(text, (plain) =>
            withCurrency(plain, edition.currency, language, w.customSymbol),
        );
    // A standard card without an amount of its own that names the salary ("Kom je langs Start, dan krijg je 200")
    // names the salary of the edition (B132, round 4 bug 3).
    const salary = salaryOf(edition, standard);
    const withSalary = (text: string): string =>
        card.amount !== undefined || salary.own === salary.standard
            ? text
            : mapCardTextSegments(text, (plain) =>
                  plain.replace(
                      new RegExp(
                          `(?<![\\p{N}.,])${String(salary.standard)}(?![\\p{N}]|[.,]\\p{N})`,
                          'gu',
                      ),
                      String(salary.own),
                  ),
              );
    const standardContext = cardTextContext(
        edition,
        card.amount,
        standardWords.customSymbol,
        standardWords,
    );
    const template =
        override?.text ??
        standardTemplate(withSalary(card.text[language]), words);
    const amountInText = parseCardText(template).some(
        (segment) => segment.type === 'amount',
    );

    return {
        ...base(edition, key),
        id: card.id,
        deck,
        base: card,
        extra,
        effect: renderCardText(
            standardTemplate(withSalary(card.effect[language]), words),
            cardTextContext(edition, card.amount, words.customSymbol, words),
        ),
        originalText: renderCardText(
            standardTemplate(card.text[language], standardWords),
            standardContext,
        ),
        template,
        text: renderCardText(
            template,
            cardTextContext(edition, amount, words.customSymbol, words),
        ),
        amount,
        standardAmount: card.amount,
        lineAmount: amountInText ? undefined : amount,
        purpose: purpose === undefined || purpose === '' ? undefined : purpose,
    };
}

/** An extra card (B135) starts empty: no text, no effect, no standard amount. */
function emptyCard(deck: DeckId, number: number): Card {
    const empty = { nl: '', en: '' };

    return {
        id: `${deck}.${String(number).padStart(2, '0')}`,
        effect: empty,
        text: empty,
    };
}

/** The standard cards of a deck, then the extra ones the edition added (B135). */
function deckCards(
    edition: Edition,
    standard: StandardEdition,
    deck: DeckId,
    words: ResolvedWords,
    standardWords: ResolvedWords,
): ResolvedCard[] {
    const cards = standard.decks[deck];
    const extra = extraCardKeys(edition.elements, deck).map((key) =>
        Number(key.split('.')[2]),
    );

    return [
        ...cards.map((card, i) =>
            resolveCard(edition, standard, deck, card, i, words, standardWords),
        ),
        ...extra.map((number) =>
            resolveCard(
                edition,
                standard,
                deck,
                emptyCard(deck, number),
                number - 1,
                words,
                standardWords,
            ),
        ),
    ];
}

/** The icon of the first Chance or Community Chest space that has one: it goes on the standard back of that deck (B136). */
export function deckIcon(
    resolved: Pick<ResolvedEdition, 'spaces'>,
    deck: DeckId,
): SpaceIcon | undefined {
    return resolved.spaces.find(
        (space) => space.base.type === deck && space.icon !== undefined,
    )?.icon;
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
                      // The colour it is printed in: its own, else the theme's, else the standard (bug 32).
                      color: groupColor(edition, id),
                      // Named after the colour it is printed in: the brown group is purple in Riso (bug 27).
                      name: groupTitle(edition, id, language),
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

    const ownables = standard.spaces.filter(
        (space): space is OwnableSpace =>
            space.type === 'street' ||
            space.type === 'station' ||
            space.type === 'utility',
    );
    const deeds: ResolvedDeed[] = ownables.map((standardSpace, index) => {
        const key = deedKey(index + 1);
        const space = applyAmounts(
            standardSpace,
            edition.elements[spaceKey(standardSpace.position)]?.amounts,
        ) as OwnableSpace;
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
                  notes,
                  bankName: bankName === '' ? undefined : bankName,
                  startingCash: standard.money.startingCash,
              }
            : null,
        pawns: parts.pawns ? pawns : null,
        boxLid: parts.boxLid ? free(edition, BOX_LID_KEY) : null,
        houseRules: parts.houseRules ? houseRules(edition, words) : null,
        rulesBooklet: parts.rulesBooklet
            ? free(edition, RULES_BOOKLET_KEY)
            : null,
        foldModels: parts.foldModels ? free(edition, FOLD_MODELS_KEY) : null,
        dice: parts.dice ? free(edition, DICE_KEY) : null,
        invitation: parts.invitation ? invitation(edition) : null,
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

/** The resolved card of a key like `card.chance.07`, standard or extra (B135); `undefined` when there is none. */
export function resolvedCardOf(
    resolved: Pick<ResolvedEdition, 'decks'>,
    key: string,
): ResolvedCard | undefined {
    const deck = key.split('.')[1];
    if (deck !== 'chance' && deck !== 'chest') {
        return undefined;
    }

    return resolved.decks?.[deck].find(
        (candidate) => `card.${candidate.id}` === key,
    );
}
