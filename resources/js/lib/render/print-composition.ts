import {
    HOUSE_RULES_KEY,
    deckCardKeys,
    deedKey,
} from '@/lib/render/edition-keys';
import type { Elements } from '@/lib/render/edition-types';
import { standardEdition } from '@/lib/render/standard-edition';
import type {
    BoardForm,
    PrintSet as GeneratedPrintSet,
} from '@/types/generated';
import type { Rect, Segment, Size } from '../../types/print';
import { DEFAULT_BOARD_PROFILE, type BoardProfile } from './print-board';
import { boardPages } from './print-compose-board';
import {
    boxLid,
    bookletHome,
    bookletPrinter,
    calibration,
    invitation,
} from './print-compose-extras';
import { moneyAmountOf, money, tokens } from './print-compose-pieces';
import { duplexCardSheets, printShopCardPages } from './print-imposition';
import { BLEED, CARD, perSet, setsOf, withCropMarks } from './print-page-frame';

export type PrintPart =
    | 'board'
    | 'cards'
    | 'money'
    | 'tokens'
    | 'box_lid'
    | 'rules_booklet'
    | 'invitation'
    | 'calibration';

export type PrintSet = GeneratedPrintSet;

/**
 * The part of an edition the print pipeline needs: the `Edition` of lib/render/edition-types.ts. The elements are
 * only the overrides of the standard data (B59), so which cards exist comes from `parts` and the standard
 * edition, plus the extra cards marked `added` (B135).
 */
export type PrintEdition = {
    name?: string;
    language?: string;
    theme?: string;
    currency?: string;
    /** `null` when the edition has none (the server writes JSON null). */
    boardProfile?: BoardProfile | null;
    parts?: Record<string, boolean>;
    /** How much play money the set prints (B156); the server fills in the choice for the set it renders. */
    moneyAmount?: string | null;
    /**
     * How many sets the cards and the money hold (B242): each set comes after the other in the same PDF, with its own
     * set mark. One when left out.
     */
    sets?: number;
    /** How the print shop delivers the board (B243); panels when left out. */
    boardForm?: BoardForm | null;
    /** How many invitations the set counts with (B244). Only the counts follow it, never the PDF. */
    invitations?: number;
    elements: Elements;
};

export type PageItemKind =
    | 'panel'
    | 'space'
    | 'center'
    | 'card'
    | 'alignment'
    | 'note'
    | 'token'
    | 'box-lid'
    | 'booklet-page'
    | 'invitation'
    | 'calibration';

export type PageItem = {
    id: string;
    kind: PageItemKind;
    /** Edition element to draw, when there is one (B60 keys). */
    elementKey: string | null;
    side?: 'front' | 'back';
    label: string;
    /** Bleed box on the page, in mm. */
    bleed: Rect;
    /** Finished (trim) box on the page, in mm. */
    trim: Rect;
    /** Quarter turn clockwise for the artwork on the sheet. */
    rotated?: boolean;
    /**
     * The set this item belongs to, when the PDF holds more than one (B242): a card back, a deed or a banknote then
     * carries the mark "SET 2".
     */
    setNumber?: number;
};

export type PageSpec = {
    size: Size;
    label: string | null;
    items: PageItem[];
    cropMarks: Segment[];
    foldLines: Segment[];
};

/**
 * The cards to print, in this order: the title deeds, then Chance, then Community Chest, then the house
 * rules card when it is on. The deeds and the decks are those of the standard edition (B100) plus the extra
 * cards the edition added (B135). The cards part always holds all of them: whether it is in the set is chosen on
 * the print page (B198).
 */
export const cardKeys = (edition: PrintEdition): string[] => {
    const keys: string[] = [];

    for (let i = 1; i <= standardEdition.components.titleDeeds; i++) {
        keys.push(deedKey(i));
    }

    for (const deck of ['chance', 'chest'] as const) {
        keys.push(...deckCardKeys(edition.elements, deck));
    }

    // The house rules card is off unless the edition says so (B99), unlike the parts above.
    if (hasHouseRulesCard(edition)) {
        keys.push(HOUSE_RULES_KEY);
    }

    return keys;
};

/**
 * The house rules card prints with the cards when it has a rule on it (B210): the editor always shows it (B198), so
 * the old switch `parts.houseRules` no longer counts. An empty card is left out of the set (bug 20 of test round 3).
 * `PrintEdition::hasHouseRules` counts the same way.
 */
export const hasHouseRulesCard = (edition: {
    elements: Readonly<Record<string, object | undefined>>;
}): boolean => {
    const element = edition.elements[HOUSE_RULES_KEY];
    const text =
        element !== undefined && 'text' in element ? element.text : undefined;

    return typeof text === 'string' && text.trim() !== '';
};

const cardsPrinter = (edition: PrintEdition): PageSpec[] => {
    const keys = cardKeys(edition);

    return printShopCardPages(keys.length, CARD, BLEED).map((page) => ({
        size: page.size,
        label: null,
        cropMarks: [],
        foldLines: [],
        items: [
            {
                id: `card.${String(page.card)}.${page.side}`,
                kind: 'card' as const,
                elementKey: keys[page.card] ?? null,
                side: page.side,
                label: keys[page.card] ?? '',
                bleed: page.bleed,
                trim: page.trim,
            },
        ],
    }));
};

/**
 * The alignment test for printing both sides (B134): a front and a back page with crosshairs at the
 * centres of the corner cards and the middle card. On the back they are mirrored like the cards, so on a
 * printer that turns the sheet straight they fall exactly behind each other.
 */
const alignmentPages = (): PageSpec[] => {
    const plan = duplexCardSheets(9, CARD);
    const sheet = plan.pages[0];

    if (sheet === undefined) {
        return [];
    }

    const page = (side: 'front' | 'back'): PageSpec => ({
        size: plan.sheet,
        label: null,
        cropMarks: [],
        foldLines: [],
        items: [
            {
                id: `alignment.${side}`,
                kind: 'alignment',
                elementKey: null,
                side,
                label: 'Uitlijntest',
                bleed: { x: 0, y: 0, ...plan.sheet },
                trim: { x: 0, y: 0, ...plan.sheet },
            },
        ],
    });

    return [page('front'), page('back')];
};

/** The points the alignment test marks: the middle of the four corner cards and of the middle card. */
export const alignmentTargets = (
    side: 'front' | 'back',
): {
    x: number;
    y: number;
}[] => {
    const plan = duplexCardSheets(9, CARD);
    const sheet = plan.pages[0];

    if (sheet === undefined) {
        return [];
    }

    const last = plan.perSheet - 1;
    const picks = [
        0,
        plan.cols - 1,
        Math.floor(last / 2),
        last - plan.cols + 1,
        last,
    ];

    return picks.flatMap((index) => {
        const slot = sheet[side].items[index];

        return slot === undefined
            ? []
            : [
                  {
                      x: slot.trim.x + slot.trim.w / 2,
                      y: slot.trim.y + slot.trim.h / 2,
                  },
              ];
    });
};

/**
 * Home cards (B134): first the alignment test, then for every sheet a page of fronts and a page of backs
 * mirrored for turning over the long edge.
 */
const cardsHome = (edition: PrintEdition): PageSpec[] => {
    const keys = cardKeys(edition);
    const plan = duplexCardSheets(keys.length, CARD, 'Kaarten');
    const side = (
        sheet: (typeof plan.pages)[number]['front'],
        which: 'front' | 'back',
    ): PageSpec => ({
        size: plan.sheet,
        label: `${sheet.label}, ${which === 'front' ? 'voorkant' : 'achterkant'}`,
        cropMarks: sheet.cropMarks,
        foldLines: [],
        items: sheet.items.map((slot) => ({
            id: `card.${String(slot.index)}.${which}`,
            kind: 'card' as const,
            elementKey: keys[slot.index] ?? null,
            side: which,
            label: keys[slot.index] ?? '',
            bleed: slot.bleed,
            trim: slot.trim,
        })),
    });

    // The alignment test comes once; the sheets of cards come once for every set (B242).
    return [
        ...alignmentPages(),
        ...perSet(setsOf(edition), () =>
            plan.pages.flatMap(({ front, back }) => [
                side(front, 'front'),
                side(back, 'back'),
            ]),
        ),
    ];
};

/**
 * Which element goes on which page and where (B54, B56, B101). The renderer only draws what this returns,
 * so swapping the placeholder renderer for the real ones touches nothing here.
 */
export const composePages = (
    part: PrintPart,
    set: PrintSet,
    edition: PrintEdition,
    profile: BoardProfile = DEFAULT_BOARD_PROFILE,
): PageSpec[] => {
    switch (part) {
        case 'board': {
            const pages = boardPages(
                set,
                edition.boardForm === 'whole',
                profile,
            );

            return set === 'home' ? pages : pages.map(withCropMarks);
        }
        case 'cards':
            return set === 'printer'
                ? perSet(setsOf(edition), () =>
                      cardsPrinter(edition).map(withCropMarks),
                  )
                : cardsHome(edition);
        case 'money':
            return perSet(setsOf(edition), () =>
                money(
                    set === 'printer' ? 'SRA3' : 'A4',
                    moneyAmountOf(edition, set),
                ),
            );
        case 'tokens':
            return tokens(edition);
        case 'box_lid':
            return set === 'printer'
                ? boxLid(profile, set).map(withCropMarks)
                : boxLid(profile, set);
        case 'rules_booklet':
            return set === 'printer'
                ? bookletPrinter().map(withCropMarks)
                : bookletHome();
        case 'invitation':
            return set === 'printer'
                ? invitation(set).map(withCropMarks)
                : invitation(set);
        case 'calibration':
            return calibration(profile);
    }
};
