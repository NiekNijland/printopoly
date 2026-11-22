import { differsFromBaseline } from '@/lib/edition/baseline';
import { groupColorName } from '@/lib/edition/group-names';
import {
    BOARD_CENTER_KEY,
    BOX_LID_KEY,
    GROUP_IDS,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    PAWN_COUNT,
    cardBackKey,
    deckCardKeys,
    deedKey,
    noteKey,
    parseKey,
    pawnKey,
    spaceKey,
    type WordId,
} from '@/lib/edition/keys';
import { messages } from '@/lib/edition/strings';
import type { Edition, Elements } from '@/lib/edition/types';
import { resolveWords } from '@/lib/edition/words';
import {
    deedsFor,
    isOwnable,
    spaceAt,
    standardEdition,
} from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';

export type EditorTab = 'board' | 'cards' | 'money' | 'box';

const TAB_ORDER: readonly EditorTab[] = ['board', 'cards', 'money', 'box'];

const SPACE_COUNT = standardEdition.spaces.length;

/** All 40 spaces in game order, then the centre (B93). */
export const BOARD_ORDER: readonly string[] = [
    ...standardEdition.spaces.map((space) => spaceKey(space.position)),
    BOARD_CENTER_KEY,
];

export function tabOfKey(key: string): EditorTab {
    switch (parseKey(key)?.kind) {
        case 'card':
        case 'cardBack':
            return 'cards';
        case 'note':
            return 'money';
        case 'pawn':
        case 'boxLid':
        case 'houseRules':
        case 'invitation':
            return 'box';
        default:
            return 'board';
    }
}

/** The tabs of the editor: always all four, whatever goes into the set (B198). */
export const EDITOR_TABS: readonly EditorTab[] = TAB_ORDER;

/** Keys of the elements of a tab, in the order the list shows them. Every part shows (B198). */
export function tabKeys(tab: EditorTab, elements: Elements = {}): string[] {
    switch (tab) {
        case 'board':
            return [...BOARD_ORDER];
        case 'cards': {
            const keys: string[] = [];
            for (const deck of ['chance', 'chest'] as const) {
                keys.push(...deckCardKeys(elements, deck));
                keys.push(cardBackKey(deck));
            }
            keys.push(cardBackKey('deed'));

            return keys;
        }
        case 'money':
            return standardEdition.money.notes.map((note) =>
                noteKey(note.value),
            );
        case 'box': {
            const keys: string[] = [BOX_LID_KEY];
            for (let i = 1; i <= PAWN_COUNT; i++) {
                if (elements[pawnKey(i)]?.hidden !== true) {
                    keys.push(pawnKey(i));
                }
            }
            keys.push(HOUSE_RULES_KEY, INVITATION_KEY);

            return keys;
        }
    }
}

/** First element of a tab. */
export function firstKey(
    tab: EditorTab,
    elements: Elements = {},
): string | undefined {
    return tabKeys(tab, elements)[0];
}

/**
 * Whether an element differs from its baseline, the template or the standard game (B152). A space also counts
 * as changed when its title deed is.
 */
export function isCustomized(edition: Edition, key: string): boolean {
    if (differsFromBaseline(edition, key)) {
        return true;
    }
    const position = spacePosition(key);
    const deed = position === undefined ? undefined : deedKeyForSpace(position);

    return deed !== undefined && differsFromBaseline(edition, deed);
}

/** Position of the deed that belongs to a space, or `undefined` when it has none. */
export function deedKeyForSpace(position: number): string | undefined {
    const space = spaceAt(position);
    if (!isOwnable(space)) {
        return undefined;
    }
    const index = deedsFor().findIndex(
        (candidate) => candidate.position === position,
    );

    return index === -1 ? undefined : deedKey(index + 1);
}

export function spacePosition(key: string): number | undefined {
    const match = /^space\.(\d{2})$/.exec(key);

    return match?.[1] === undefined ? undefined : Number(match[1]);
}

/** The next or previous key in `keys`, wrapping around. */
export function stepKey(
    keys: readonly string[],
    key: string,
    step: 1 | -1,
): string | undefined {
    const index = keys.indexOf(key);
    if (keys.length === 0) {
        return undefined;
    }
    const next = (index + step + keys.length) % keys.length;

    return keys[next];
}

const DECK_NAME: Record<Locale, Record<'chance' | 'chest' | 'deed', string>> = {
    nl: { chance: 'Kans', chest: 'Algemeen Fonds', deed: 'Eigendomsbewijs' },
    en: { chance: 'Chance', chest: 'Community Chest', deed: 'Title deed' },
};

/** The name of a deck in the lists: the edition's own word when it has one, else the standard name. */
export function deckLabel(
    edition: Edition,
    deck: 'chance' | 'chest' | 'deed',
    interfaceLanguage: Locale,
): string {
    if (deck === 'deed') {
        return DECK_NAME[interfaceLanguage].deed;
    }

    const words = resolveWords(edition);

    return words.custom[deck]
        ? words.decks[deck]
        : DECK_NAME[interfaceLanguage][deck];
}

/**
 * Short name of an element for lists, labels and the Controle list: "Stadspark", "Kanskaart 7",
 * "Biljet van 100", "Pion 3". Names a person typed win over the standard names.
 */
export function elementLabel(
    key: string,
    edition: Edition,
    interfaceLanguage: Locale,
): string {
    const parsed = parseKey(key);
    const override = edition.elements[key];
    const language = edition.language;
    const names = messages[interfaceLanguage];
    const word = LABELS[interfaceLanguage];

    switch (parsed?.kind) {
        case 'space': {
            const space = spaceAt(spacePosition(key) ?? 0);
            if (override?.name !== undefined) {
                return override.name;
            }

            // A Kans or Algemeen Fonds space is called after its deck, like on the board (B145).
            return space.type === 'chance' || space.type === 'chest'
                ? resolveWords(edition).decks[space.type]
                : space.name[language];
        }
        case 'deed': {
            const index = Number(key.split('.')[1]);
            const space = deedsFor()[index - 1];
            const spaceName =
                space === undefined
                    ? ''
                    : (edition.elements[spaceKey(space.position)]?.name ??
                      space.name[language]);

            return `${word.deed}: ${override?.name ?? spaceName}`;
        }
        case 'card': {
            const [, deck, number] = key.split('.');

            return `${deckLabel(edition, deck === 'chance' ? 'chance' : 'chest', interfaceLanguage)} ${Number(number)}`;
        }
        case 'cardBack': {
            const deck = key.split('.')[1];
            const name = deckLabel(
                edition,
                deck === 'chance' || deck === 'chest' ? deck : 'deed',
                interfaceLanguage,
            );

            return `${name}: ${word.back}`;
        }
        case 'note':
            return `${word.note} ${key.split('.')[1] ?? ''}`;
        case 'pawn': {
            const index = Number(key.split('.')[1]);

            return override?.name ?? names.pawnName(index);
        }
        case 'boxLid':
            return word.boxLid;
        case 'boardCenter':
            return word.center;
        case 'houseRules':
            return word.houseRules;
        case 'rulesBooklet':
            return word.rulesBooklet;
        case 'foldModels':
            return word.foldModels;
        case 'dice':
            return word.dice;
        case 'invitation':
            return word.invitation;
        case 'words':
            return `${word.words}: ${WORD_NAME[interfaceLanguage][key.split('.')[1] as WordId] ?? ''}`;
        case 'themeAccent':
            return word.colors;
        case 'group': {
            // A colour group by the colour it is printed in, never its key (bug 28).
            const id = GROUP_IDS.find((group) => key === `group.${group}`);

            return id === undefined
                ? word.colors
                : word.group(
                      groupColorName(edition, id, interfaceLanguage).name,
                  );
        }
        default:
            return key;
    }
}

const WORD_NAME: Record<Locale, Record<WordId, string>> = {
    nl: {
        house: 'huis',
        hotel: 'hotel',
        jail: 'gevangenis',
        currency: 'munt',
        chance: 'eerste kaartstapel',
        chest: 'tweede kaartstapel',
        bank: 'naam van de bank',
        station: 'station',
        utility: 'nutsbedrijf',
    },
    en: {
        house: 'house',
        hotel: 'hotel',
        jail: 'jail',
        currency: 'currency',
        chance: 'first deck',
        chest: 'second deck',
        bank: 'name of the bank',
        station: 'station',
        utility: 'utility',
    },
};

const LABELS: Record<
    Locale,
    {
        deed: string;
        back: string;
        note: string;
        boxLid: string;
        center: string;
        houseRules: string;
        rulesBooklet: string;
        foldModels: string;
        dice: string;
        invitation: string;
        words: string;
        colors: string;
        group: (color: string) => string;
    }
> = {
    nl: {
        deed: 'Eigendomsbewijs',
        back: 'achterkant',
        note: 'Biljet van',
        boxLid: 'Doosdeksel',
        center: 'Midden van het bord',
        houseRules: 'Huisregels',
        rulesBooklet: 'Spelregelboekje',
        foldModels: 'Huisjes en hotels',
        dice: 'Dobbelstenen',
        invitation: 'Uitnodiging',
        words: 'Woord',
        colors: 'Kleuren',
        group: (color) => `Groep ${color}`,
    },
    en: {
        deed: 'Title deed',
        back: 'back',
        note: 'Note of',
        boxLid: 'Box lid',
        center: 'Centre of the board',
        houseRules: 'House rules',
        rulesBooklet: 'Rules booklet',
        foldModels: 'Houses and hotels',
        dice: 'Dice',
        invitation: 'Invitation',
        words: 'Word',
        colors: 'Colours',
        group: (color) =>
            `${color.charAt(0).toUpperCase()}${color.slice(1)} group`,
    },
};

export interface BoardGroup {
    /** Start of the stretch, for the heading ("Start tot Op bezoek"). */
    from: number;
    to: number;
    keys: string[];
}

/** The board in four stretches between the corners, for the list under the navigator (B93). */
export function boardGroups(): BoardGroup[] {
    return [0, 10, 20, 30].map((from) => ({
        from,
        to: (from + 10) % SPACE_COUNT,
        keys: Array.from({ length: 10 }, (_, i) => spaceKey(from + i)),
    }));
}

/**
 * Whether an element has a photo frame in the print: streets, stations, utilities and corners on the board
 * (Chance, Community Chest and tax spaces draw text only), and everything outside the board except the board
 * centre, which takes photos as free layers. A choice of several photos only fills elements that pass this.
 */
export function holdsPhoto(key: string): boolean {
    const parsed = parseKey(key);

    if (parsed === null || parsed.kind === 'boardCenter') {
        return false;
    }

    if (parsed.kind !== 'space') {
        return true;
    }

    const type = spaceAt(Number(key.slice('space.'.length))).type;

    return (
        type === 'street' ||
        type === 'station' ||
        type === 'utility' ||
        type === 'corner'
    );
}
