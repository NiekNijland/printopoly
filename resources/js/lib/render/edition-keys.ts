import { standardEdition } from '@/lib/render/standard-edition';
import type { GroupId } from '@/types/game';
import { partOfStyleKey } from './edition-part-styles';
import type { ElementField, PartId } from './edition-types';

/** Element keys are fixed strings, never array positions (B60). */
export type ElementKind =
    | 'space'
    | 'deed'
    | 'card'
    | 'note'
    | 'pawn'
    | 'cardBack'
    | 'boxLid'
    | 'boardCenter'
    | 'houseRules'
    | 'rulesBooklet'
    | 'invitation'
    | 'group'
    | 'words'
    | 'themeAccent'
    | 'partStyle';

export type ParsedKey = {
    kind: ElementKind;
    part: PartId;
};

const pad = (n: number) => String(n).padStart(2, '0');

export const spaceKey = (position: number) => `space.${pad(position)}`;
export const deedKey = (index: number) => `deed.${pad(index)}`;
export const cardKey = (deck: 'chance' | 'chest', index: number) =>
    `card.${deck}.${pad(index)}`;
export const noteKey = (value: number) => `note.${value}`;
export const pawnKey = (index: number) => `pawn.${pad(index)}`;
export const cardBackKey = (deck: 'chance' | 'chest' | 'deed') =>
    `card_back.${deck}`;
export const groupKey = (group: GroupId) => `group.${group}`;
/** The accent colour of the edition, on top of the theme (B130). */
export const THEME_ACCENT_KEY = 'theme_accent';
export const BOX_LID_KEY = 'box_lid';
export const BOARD_CENTER_KEY = 'board_center';
export const HOUSE_RULES_KEY = 'house_rules';
export const RULES_BOOKLET_KEY = 'rules_booklet';
export const INVITATION_KEY = 'invitation';
/**
 * The fixed words of the game that an edition can rename: `words.house`, `words.currency`, and so on. The name of
 * the bank on every note is a word too (B148).
 */
export const WORD_IDS = [
    'house',
    'hotel',
    'jail',
    'currency',
    'chance',
    'chest',
    'bank',
    'station',
    'utility',
] as const;
export type WordId = (typeof WORD_IDS)[number];
export const wordKey = (id: WordId) => `words.${id}`;
/** The name of the bank, printed on every note (B148). */
export const BANK_KEY = wordKey('bank');
/**
 * Keys that older editions still carry, with the key they moved to. The bank name was its own element `bank`
 * until it became a word of the edition (B148).
 */
export const LEGACY_KEYS: Readonly<Record<string, string>> = {
    bank: BANK_KEY,
};

/** Keys of elements that are gone (the dice and the houses and hotels, B200): dropped when read. */
export const REMOVED_KEYS: readonly string[] = ['fold_models', 'dice'];

const noteValues = new Set(
    standardEdition.money.notes.map((note) => note.value),
);
const deedCount = standardEdition.components.titleDeeds;
const spaceCount = standardEdition.spaces.length;
/** Cards in a standard deck (16): `card.chance.01` to `card.chance.16`. */
export const STANDARD_DECK_SIZE = standardEdition.decks.chance.length;
/** A deck holds up to 32 cards: the 16 standard ones and up to 16 extra ones (B135). */
export const MAX_DECK_SIZE = 32;
export const PAWN_COUNT = 8;

/** The colour groups of the street spaces, in board order. */
export const GROUP_IDS: readonly GroupId[] = standardEdition.groups.map(
    (group) => group.id,
);

const inRange = (text: string, min: number, max: number): boolean => {
    if (!/^\d{2}$/.test(text)) {
        return false;
    }
    const n = Number(text);

    return n >= min && n <= max;
};

type KeyParser = (parts: readonly string[], key: string) => ParsedKey | null;

const single =
    (kind: ElementKind, part: PartId): KeyParser =>
    (parts) =>
        parts.length === 1 ? { kind, part } : null;

const numbered =
    (kind: ElementKind, part: PartId, min: number, max: number): KeyParser =>
    ([, second, ...rest]) =>
        rest.length === 0 && second !== undefined && inRange(second, min, max)
            ? { kind, part }
            : null;

const KEY_PARSERS: ReadonlyMap<string, KeyParser> = new Map<string, KeyParser>([
    ['space', numbered('space', 'board', 0, spaceCount - 1)],
    ['deed', numbered('deed', 'deeds', 1, deedCount)],
    [
        'card',
        (parts) => {
            const [, second, third] = parts;

            return parts.length === 3 &&
                (second === 'chance' || second === 'chest') &&
                third !== undefined &&
                inRange(third, 1, MAX_DECK_SIZE)
                ? { kind: 'card', part: 'cards' }
                : null;
        },
    ],
    [
        'note',
        (parts) => {
            const [, second] = parts;

            return parts.length === 2 &&
                second !== undefined &&
                noteValues.has(Number(second)) &&
                String(Number(second)) === second
                ? { kind: 'note', part: 'money' }
                : null;
        },
    ],
    ['pawn', numbered('pawn', 'pawns', 1, PAWN_COUNT)],
    [
        'card_back',
        (parts) => {
            const [, second] = parts;

            return parts.length === 2 &&
                (second === 'chance' || second === 'chest' || second === 'deed')
                ? {
                      kind: 'cardBack',
                      part: second === 'deed' ? 'deeds' : 'cards',
                  }
                : null;
        },
    ],
    ['box_lid', single('boxLid', 'boxLid')],
    ['board_center', single('boardCenter', 'board')],
    ['house_rules', single('houseRules', 'houseRules')],
    ['rules_booklet', single('rulesBooklet', 'rulesBooklet')],
    ['invitation', single('invitation', 'invitation')],
    [
        'group',
        (parts) => {
            const [, second] = parts;

            return parts.length === 2 && GROUP_IDS.some((id) => id === second)
                ? { kind: 'group', part: 'board' }
                : null;
        },
    ],
    [
        'words',
        (parts) => {
            const [, second] = parts;

            return parts.length === 2 && WORD_IDS.some((id) => id === second)
                ? { kind: 'words', part: 'board' }
                : null;
        },
    ],
    ['theme_accent', single('themeAccent', 'board')],
    [
        'style',
        (_parts, key) => {
            // The style of a part (B268): `style.board`, `style.cards`, … `style.box_lid`.
            const part = partOfStyleKey(key);

            return part === null ? null : { kind: 'partStyle', part };
        },
    ],
]);

/** Returns what an element key is, or `null` when it is not a valid key. */
export const parseKey = (key: string): ParsedKey | null => {
    const parts = key.split('.');
    const [head] = parts;
    const parser = head === undefined ? undefined : KEY_PARSERS.get(head);

    return parser?.(parts, key) ?? null;
};

/** Which fields an element kind accepts. Amounts of the board and of cards stay within 20% of the standard (B132). */
export const ALLOWED_FIELDS: Readonly<
    Record<ElementKind, readonly ElementField[]>
> = {
    space: [
        'name',
        'text',
        'amounts',
        'photo',
        'photoStyle',
        'icon',
        'deedPhoto',
    ],
    /** `text` is the short story on the back of the deed (B169). */
    deed: ['name', 'text', 'photo', 'photoStyle'],
    /** `added` marks an extra card after the standard 16 (B135). */
    card: ['text', 'amount', 'purpose', 'photo', 'photoStyle', 'added'],
    note: ['photo', 'photoStyle', 'color'],
    pawn: ['name', 'photo', 'photoStyle', 'hidden'],
    cardBack: ['photo', 'layers', 'pattern'],
    boxLid: [
        'name',
        'subtitle',
        'text',
        'photo',
        'photoStyle',
        'layers',
        'titleOffset',
        'titleBand',
        'titleStyle',
    ],
    boardCenter: [
        'name',
        'photo',
        'layers',
        'centerMode',
        'subtitle',
        'photoAspect',
        'photoFrame',
        'background',
        'titleOffset',
        'titleScale',
        'titleHidden',
        'centerPlace',
        'logoTilt',
        'titleStyle',
    ],
    houseRules: ['text', 'photo'],
    rulesBooklet: ['photo'],
    /** `name` is the headline and `subtitle` the small line above it (B169). */
    invitation: ['name', 'subtitle', 'text', 'photo'],
    group: ['town', 'color'],
    /** Name, plus the plural (houses, hotels) or the symbol (currency) in `text`; the bank has a name only. */
    words: ['name', 'text'],
    themeAccent: ['color'],
    partStyle: ['style'],
};

/** The part an element key belongs to, or `null` for an invalid key. */
export const partOfKey = (key: string): PartId | null => {
    return parseKey(key)?.part ?? null;
};

/** Whether a key is an extra card after the standard ones (B135): `card.chance.17` to `card.chance.32`. */
export const isExtraCardKey = (key: string): boolean => {
    const parsed = parseKey(key);

    return (
        parsed?.kind === 'card' &&
        Number(key.split('.')[2]) > STANDARD_DECK_SIZE
    );
};

/** The extra cards of a deck that the edition added (B135), in order. */
export const extraCardKeys = (
    elements: Readonly<Record<string, object | undefined>>,
    deck: 'chance' | 'chest',
): string[] => {
    const keys: string[] = [];
    for (let i = STANDARD_DECK_SIZE + 1; i <= MAX_DECK_SIZE; i++) {
        const element = elements[cardKey(deck, i)];
        if (
            element !== undefined &&
            'added' in element &&
            element.added === true
        ) {
            keys.push(cardKey(deck, i));
        }
    }

    return keys;
};

/** Every card of a deck: the 16 standard ones, then the extra ones (B135). */
export const deckCardKeys = (
    elements: Readonly<Record<string, object | undefined>>,
    deck: 'chance' | 'chest',
): string[] => {
    return [
        ...Array.from({ length: STANDARD_DECK_SIZE }, (_, i) =>
            cardKey(deck, i + 1),
        ),
        ...extraCardKeys(elements, deck),
    ];
};

/**
 * "Namen leegmaken" (B201): the safety net next to "Kaarten leegmaken" (B194) for a template whose street names do
 * not fit. It works on the spaces a template names: the streets, the stations and the utilities.
 */
export const NAMED_SPACE_KEYS: readonly string[] = standardEdition.spaces
    .filter((space) => ['street', 'station', 'utility'].includes(space.type))
    .map((space) => spaceKey(space.position));
