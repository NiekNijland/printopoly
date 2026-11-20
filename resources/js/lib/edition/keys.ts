import { standardEdition } from '@/lib/game/standard-edition';
import type { GroupId } from '@/lib/game/types';
import type { ElementField, PartId } from './types';

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
    | 'foldModels'
    | 'dice'
    | 'invitation'
    | 'bank'
    | 'group'
    | 'words'
    | 'themeAccent';

export interface ParsedKey {
    kind: ElementKind;
    part: PartId;
}

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
export const FOLD_MODELS_KEY = 'fold_models';
export const DICE_KEY = 'dice';
export const INVITATION_KEY = 'invitation';
/** The name of the bank, printed on every note. */
export const BANK_KEY = 'bank';

/** The fixed words of the game that an edition can rename: `words.house`, `words.currency`, and so on. */
export const WORD_IDS = [
    'house',
    'hotel',
    'jail',
    'currency',
    'chance',
    'chest',
] as const;
export type WordId = (typeof WORD_IDS)[number];
export const wordKey = (id: WordId) => `words.${id}`;

const noteValues = new Set(
    standardEdition.money.notes.map((note) => note.value),
);
const deedCount = standardEdition.components.titleDeeds;
const spaceCount = standardEdition.spaces.length;
const cardCount = standardEdition.decks.chance.length;
export const PAWN_COUNT = 8;

/** The colour groups of the street spaces, in board order. */
export const GROUP_IDS: readonly GroupId[] = standardEdition.groups.map(
    (group) => group.id,
);

function inRange(text: string, min: number, max: number): boolean {
    if (!/^\d{2}$/.test(text)) {
        return false;
    }
    const n = Number(text);

    return n >= min && n <= max;
}

/** Returns what an element key is, or `null` when it is not a valid key. */
export function parseKey(key: string): ParsedKey | null {
    const parts = key.split('.');
    const [head, second, third] = parts;

    switch (head) {
        case 'space':
            return parts.length === 2 &&
                second !== undefined &&
                inRange(second, 0, spaceCount - 1)
                ? { kind: 'space', part: 'board' }
                : null;
        case 'deed':
            return parts.length === 2 &&
                second !== undefined &&
                inRange(second, 1, deedCount)
                ? { kind: 'deed', part: 'deeds' }
                : null;
        case 'card':
            return parts.length === 3 &&
                (second === 'chance' || second === 'chest') &&
                third !== undefined &&
                inRange(third, 1, cardCount)
                ? { kind: 'card', part: 'cards' }
                : null;
        case 'note':
            return parts.length === 2 &&
                second !== undefined &&
                noteValues.has(Number(second)) &&
                String(Number(second)) === second
                ? { kind: 'note', part: 'money' }
                : null;
        case 'pawn':
            return parts.length === 2 &&
                second !== undefined &&
                inRange(second, 1, PAWN_COUNT)
                ? { kind: 'pawn', part: 'pawns' }
                : null;
        case 'card_back':
            return parts.length === 2 &&
                (second === 'chance' || second === 'chest' || second === 'deed')
                ? {
                      kind: 'cardBack',
                      part: second === 'deed' ? 'deeds' : 'cards',
                  }
                : null;
        case 'box_lid':
            return parts.length === 1
                ? { kind: 'boxLid', part: 'boxLid' }
                : null;
        case 'board_center':
            return parts.length === 1
                ? { kind: 'boardCenter', part: 'board' }
                : null;
        case 'house_rules':
            return parts.length === 1
                ? { kind: 'houseRules', part: 'houseRules' }
                : null;
        case 'rules_booklet':
            return parts.length === 1
                ? { kind: 'rulesBooklet', part: 'rulesBooklet' }
                : null;
        case 'fold_models':
            return parts.length === 1
                ? { kind: 'foldModels', part: 'foldModels' }
                : null;
        case 'dice':
            return parts.length === 1 ? { kind: 'dice', part: 'dice' } : null;
        case 'invitation':
            return parts.length === 1
                ? { kind: 'invitation', part: 'invitation' }
                : null;
        case 'bank':
            return parts.length === 1 ? { kind: 'bank', part: 'money' } : null;
        case 'group':
            return parts.length === 2 &&
                second !== undefined &&
                (GROUP_IDS as readonly string[]).includes(second)
                ? { kind: 'group', part: 'board' }
                : null;
        case 'words':
            return parts.length === 2 &&
                (WORD_IDS as readonly string[]).includes(second ?? '')
                ? { kind: 'words', part: 'board' }
                : null;
        case 'theme_accent':
            return parts.length === 1
                ? { kind: 'themeAccent', part: 'board' }
                : null;
        default:
            return null;
    }
}

/** Which fields an element kind accepts. Amounts only on cards (B29, B32, B58). */
export const ALLOWED_FIELDS: Readonly<
    Record<ElementKind, readonly ElementField[]>
> = {
    space: ['name', 'text', 'photo', 'photoStyle'],
    deed: ['name', 'photo', 'photoStyle'],
    card: ['text', 'amount', 'photo', 'photoStyle'],
    note: ['photo', 'photoStyle', 'color'],
    pawn: ['name', 'photo', 'photoStyle', 'hidden'],
    cardBack: ['photo', 'layers', 'pattern'],
    boxLid: ['name', 'photo', 'photoStyle', 'layers'],
    boardCenter: [
        'name',
        'photo',
        'layers',
        'centerMode',
        'subtitle',
        'photoAspect',
        'photoFrame',
        'background',
    ],
    houseRules: ['text', 'photo'],
    rulesBooklet: ['photo'],
    foldModels: ['photo'],
    dice: ['photo'],
    invitation: ['text', 'photo'],
    bank: ['name'],
    group: ['town', 'color'],
    /** Name, plus the plural (houses, hotels) or the symbol (currency) in `text`. */
    words: ['name', 'text'],
    themeAccent: ['color'],
};

/** The part an element key belongs to, or `null` for an invalid key. */
export function partOfKey(key: string): PartId | null {
    return parseKey(key)?.part ?? null;
}
