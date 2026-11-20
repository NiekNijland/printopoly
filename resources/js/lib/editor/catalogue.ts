import {
    BOARD_CENTER_KEY,
    BOX_LID_KEY,
    PAWN_COUNT,
    cardBackKey,
    cardKey,
    deedKey,
    noteKey,
    parseKey,
    pawnKey,
    spaceKey,
    type ElementKind,
} from '@/lib/edition/keys';
import { messages } from '@/lib/edition/strings';
import type { Edition, Parts } from '@/lib/edition/types';
import {
    deedsFor,
    isOwnable,
    spaceAt,
    standardEdition,
} from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';

export type EditorTab = 'board' | 'cards' | 'money' | 'box';

export const TAB_ORDER: readonly EditorTab[] = [
    'board',
    'cards',
    'money',
    'box',
];

export const SPACE_COUNT = standardEdition.spaces.length;

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
            return 'box';
        default:
            return 'board';
    }
}

/** Which tabs show for the chosen parts (B99). Deed backs live under Kaarten. */
export function visibleTabs(parts: Parts): EditorTab[] {
    return TAB_ORDER.filter((tab) => {
        switch (tab) {
            case 'board':
                return true;
            case 'cards':
                return parts.cards || parts.deeds;
            case 'money':
                return parts.money;
            case 'box':
                return parts.boxLid || parts.pawns;
        }
    });
}

/** Keys of the elements of a tab, in the order the list shows them. */
export function tabKeys(tab: EditorTab, parts: Parts): string[] {
    switch (tab) {
        case 'board':
            return [...BOARD_ORDER];
        case 'cards': {
            const keys: string[] = [];
            if (parts.cards) {
                for (const deck of ['chance', 'chest'] as const) {
                    for (
                        let i = 1;
                        i <= standardEdition.decks[deck].length;
                        i++
                    ) {
                        keys.push(cardKey(deck, i));
                    }
                    keys.push(cardBackKey(deck));
                }
            }
            if (parts.deeds) {
                keys.push(cardBackKey('deed'));
            }

            return keys;
        }
        case 'money':
            return standardEdition.money.notes.map((note) =>
                noteKey(note.value),
            );
        case 'box': {
            const keys: string[] = [];
            if (parts.boxLid) {
                keys.push(BOX_LID_KEY);
            }
            if (parts.pawns) {
                for (let i = 1; i <= PAWN_COUNT; i++) {
                    keys.push(pawnKey(i));
                }
            }

            return keys;
        }
    }
}

/** First element of a tab. */
export function firstKey(tab: EditorTab, parts: Parts): string | undefined {
    return tabKeys(tab, parts)[0];
}

/** Customized and total elements of a tab, for the "14/41" next to its name. */
export function tabCounts(
    tab: EditorTab,
    edition: Edition,
): { customized: number; total: number } {
    const keys = tabKeys(tab, edition.parts);

    return {
        customized: keys.filter((key) => isCustomized(edition, key)).length,
        total: keys.length,
    };
}

/** A space also counts as changed when its title deed is. */
export function isCustomized(edition: Edition, key: string): boolean {
    if (edition.elements[key] !== undefined) {
        return true;
    }
    const position = spacePosition(key);
    const deed =
        position === undefined || !edition.parts.deeds
            ? undefined
            : deedKeyForSpace(position);

    return deed !== undefined && edition.elements[deed] !== undefined;
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

/** Kind of an element key, for choosing fields and renderer. */
export function kindOf(key: string): ElementKind | null {
    return parseKey(key)?.kind ?? null;
}

const DECK_NAME: Record<Locale, Record<'chance' | 'chest' | 'deed', string>> = {
    nl: { chance: 'Kans', chest: 'Algemeen Fonds', deed: 'Eigendomsbewijs' },
    en: { chance: 'Chance', chest: 'Community Chest', deed: 'Title deed' },
};

export function deckName(deck: 'chance' | 'chest' | 'deed', locale: Locale) {
    return DECK_NAME[locale][deck];
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
            const position = spacePosition(key) ?? 0;

            return override?.name ?? spaceAt(position).name[language];
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

            return `${deck === 'chance' ? DECK_NAME[interfaceLanguage].chance : DECK_NAME[interfaceLanguage].chest} ${Number(number)}`;
        }
        case 'cardBack': {
            const deck = key.split('.')[1];
            const name =
                DECK_NAME[interfaceLanguage][
                    deck === 'chance' || deck === 'chest' ? deck : 'deed'
                ];

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
        default:
            return key;
    }
}

const LABELS: Record<
    Locale,
    {
        deed: string;
        back: string;
        note: string;
        boxLid: string;
        center: string;
        houseRules: string;
    }
> = {
    nl: {
        deed: 'Eigendomsbewijs',
        back: 'achterkant',
        note: 'Biljet van',
        boxLid: 'Doosdeksel',
        center: 'Midden van het bord',
        houseRules: 'Huisregels',
    },
    en: {
        deed: 'Title deed',
        back: 'back',
        note: 'Note of',
        boxLid: 'Box lid',
        center: 'Centre of the board',
        houseRules: 'House rules',
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
