import {
    BOX_LID_KEY,
    DICE_KEY,
    FOLD_MODELS_KEY,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    RULES_BOOKLET_KEY,
    deckCardKeys,
    deedKey,
    noteKey,
    pawnKey,
} from '@/lib/edition/keys';
import { standardEdition } from '@/lib/game/standard-edition';
import { DEFAULT_BOARD_PROFILE, type BoardProfile } from './board';
import { calibrationSheet } from './calibration';
import {
    A4,
    BOOKLET_PAGE,
    BOOKLET_PAGES,
    INVITATION,
    bookletSpreads,
    foldSheets,
    invitationCells,
    invitationCutLines,
} from './extras';
import { packStickers, stickerPieces } from './home-stickers';
import {
    SHEET_PRESETS,
    cropMarksFor,
    duplexCardSheets,
    impose,
    moneySheets,
    printShopCardPages,
    type Imposition,
} from './imposition';
import { splitPanels } from './panels';
import type { Rect, Segment, Size } from './types';

export const PRINT_PARTS = [
    'board',
    'cards',
    'money',
    'tokens',
    'box_lid',
    'rules_booklet',
    'fold_models',
    'dice',
    'invitation',
    'calibration',
] as const;
export type PrintPart = (typeof PRINT_PARTS)[number];

export type PrintSet = 'printer' | 'home';

/** The photo of an element, as the edition stores it, with the crop the server made of it. */
export interface PrintPhoto {
    photoId: string;
    /** Signed URL of the pre-cropped JPEG, filled in by the print job. */
    src?: string;
}

export interface PrintElement {
    photo?: PrintPhoto;
    [key: string]: unknown;
}

/**
 * The part of an edition the print pipeline needs: the `Edition` of lib/edition/types.ts. The elements are
 * only the overrides of the standard data (B59), so which cards exist comes from `parts` and the standard
 * edition, plus the extra cards marked `added` (B135).
 */
export interface PrintEdition {
    name?: string;
    language?: string;
    theme?: string;
    currency?: string;
    /** `null` when the edition has none (the server writes JSON null). */
    boardProfile?: BoardProfile | null;
    parts?: Record<string, boolean>;
    elements: Record<string, PrintElement>;
}

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
    | 'fold-sheet'
    | 'dice-sheet'
    | 'invitation'
    | 'calibration';

export interface PageItem {
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
}

export interface PageSpec {
    size: Size;
    label: string | null;
    items: PageItem[];
    cropMarks: Segment[];
    foldLines: Segment[];
}

export const BLEED = 3;
export const CARD: Size = { w: 63, h: 88 };
/** One unfolded pawn (PAWN_SIZE_MM of components/render/pawn.tsx; print-document.test.tsx keeps them equal). */
export const TOKEN_SIZE: Size = { w: 40, h: 55 };
export const TOKEN_COUNT = 8;

function on(edition: PrintEdition, part: string): boolean {
    return edition.parts?.[part] !== false;
}

/**
 * The cards to print, in this order: the title deeds, then Chance, then Community Chest, then the house
 * rules card when it is on. The deeds and the decks are those of the standard edition (B100) plus the extra
 * cards the edition added (B135), each only when its part is on (B99).
 */
export function cardKeys(edition: PrintEdition): string[] {
    const keys: string[] = [];

    if (on(edition, 'deeds')) {
        for (let i = 1; i <= standardEdition.components.titleDeeds; i++) {
            keys.push(deedKey(i));
        }
    }

    if (on(edition, 'cards')) {
        for (const deck of ['chance', 'chest'] as const) {
            keys.push(...deckCardKeys(edition.elements ?? {}, deck));
        }
    }

    // The house rules card is off unless the edition says so (B99), unlike the parts above.
    if (edition.parts?.houseRules === true) {
        keys.push(HOUSE_RULES_KEY);
    }

    return keys;
}

/** The note a banknote index is: 30 of each value, in the order of the standard edition. */
function noteKeys(): string[] {
    return standardEdition.money.notes.flatMap((note) =>
        Array.from({ length: note.count }, () => noteKey(note.value)),
    );
}

function fromImposition(
    imp: Imposition,
    kind: PageItemKind,
    itemFor: (index: number) => { key: string | null; label: string },
): PageSpec[] {
    return imp.sheets.map((sheet) => ({
        size: imp.sheet,
        label: sheet.label,
        cropMarks: sheet.cropMarks,
        foldLines: sheet.foldLines,
        items: sheet.items.map((slot) => {
            const { key, label } = itemFor(slot.index);

            return {
                id: `${kind}.${String(slot.index)}`,
                kind,
                elementKey: key,
                label,
                bleed: slot.bleed,
                trim: slot.trim,
            };
        }),
    }));
}

function boardPrinter(profile: BoardProfile): PageSpec[] {
    return splitPanels(profile).map((panel) => ({
        size: panel.size,
        label: `Paneel ${panel.id}`,
        cropMarks: [],
        foldLines: [],
        items: [
            {
                id: `panel.${panel.id}`,
                kind: 'panel' as const,
                elementKey: null,
                label: `Paneel ${panel.id}`,
                bleed: { x: 0, y: 0, ...panel.size },
                trim: {
                    x: panel.trimOffset.x,
                    y: panel.trimOffset.y,
                    w: panel.trim.w,
                    h: panel.trim.h,
                },
            },
        ],
    }));
}

function boardHome(profile: BoardProfile): PageSpec[] {
    const pieces = stickerPieces(profile);
    const byId = new Map(pieces.map((piece) => [piece.id, piece]));

    return packStickers(pieces).map((sheet) => {
        const items = sheet.placements.map((placement): PageItem => {
            const piece = byId.get(placement.id);
            const bleed = {
                x: placement.x,
                y: placement.y,
                w: placement.w,
                h: placement.h,
            };

            return {
                id: placement.id,
                kind: piece?.kind === 'center' ? 'center' : 'space',
                elementKey: null,
                label: placement.id,
                bleed,
                trim: {
                    x: bleed.x + BLEED,
                    y: bleed.y + BLEED,
                    w: bleed.w - 2 * BLEED,
                    h: bleed.h - 2 * BLEED,
                },
                rotated: placement.rotated,
            };
        });

        return {
            size: SHEET_PRESETS.A4,
            label: `Bord ${String(sheet.index + 1)}`,
            items,
            cropMarks: items.flatMap((item) =>
                cropMarksFor(item.trim, BLEED, 3),
            ),
            foldLines: [],
        };
    });
}

function cardsPrinter(edition: PrintEdition): PageSpec[] {
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
}

/**
 * The alignment test for printing both sides (B134): a front and a back page with crosshairs at the
 * centres of the corner cards and the middle card. On the back they are mirrored like the cards, so on a
 * printer that turns the sheet straight they fall exactly behind each other.
 */
export function alignmentPages(): PageSpec[] {
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
}

/** The points the alignment test marks: the middle of the four corner cards and of the middle card. */
export function alignmentTargets(side: 'front' | 'back'): {
    x: number;
    y: number;
}[] {
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
}

/**
 * Home cards (B134): first the alignment test, then for every sheet a page of fronts and a page of backs
 * mirrored for turning over the long edge.
 */
function cardsHome(edition: PrintEdition): PageSpec[] {
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

    return [
        ...alignmentPages(),
        ...plan.pages.flatMap(({ front, back }) => [
            side(front, 'front'),
            side(back, 'back'),
        ]),
    ];
}

function money(sheet: 'A4' | 'SRA3'): PageSpec[] {
    const keys = noteKeys();

    return fromImposition(moneySheets(undefined, sheet), 'note', (index) => ({
        key: keys[index] ?? null,
        label: keys[index] ?? '',
    }));
}

function tokens(): PageSpec[] {
    return fromImposition(
        impose({
            item: TOKEN_SIZE,
            bleed: 0,
            sheet: 'A4',
            margin: 8,
            gap: 3,
            count: TOKEN_COUNT,
            cropMarks: true,
            labelPrefix: 'Pionnen',
        }),
        'token',
        (index) => ({
            key: pawnKey(index + 1),
            label: `Pion ${String(index + 1)}`,
        }),
    );
}

function boxLid(profile: BoardProfile, set: PrintSet): PageSpec[] {
    const item = profile.boxLid;

    if (set === 'printer') {
        const size = { w: item.w + 2 * BLEED, h: item.h + 2 * BLEED };

        return [
            {
                size,
                label: null,
                cropMarks: [],
                foldLines: [],
                items: [
                    {
                        id: 'box-lid',
                        kind: 'box-lid',
                        elementKey: BOX_LID_KEY,
                        label: 'Doosdeksel',
                        bleed: { x: 0, y: 0, ...size },
                        trim: { x: BLEED, y: BLEED, ...item },
                    },
                ],
            },
        ];
    }

    return fromImposition(
        impose({
            item,
            bleed: BLEED,
            sheet: 'A3',
            margin: 10,
            gap: 3,
            count: 1,
            cropMarks: true,
            labelPrefix: 'Doosdeksel',
        }),
        'box-lid',
        () => ({
            key: BOX_LID_KEY,
            label: 'Doosdeksel',
        }),
    );
}

/** One A5 page of the booklet, with 3 mm bleed for the print shop. */
function bookletPrinter(): PageSpec[] {
    const size = {
        w: BOOKLET_PAGE.w + 2 * BLEED,
        h: BOOKLET_PAGE.h + 2 * BLEED,
    };

    return Array.from({ length: BOOKLET_PAGES }, (_, index) => ({
        size,
        label: null,
        cropMarks: [],
        foldLines: [],
        items: [
            {
                id: `booklet.${String(index + 1)}`,
                kind: 'booklet-page' as const,
                elementKey: RULES_BOOKLET_KEY,
                label: `Pagina ${String(index + 1)}`,
                bleed: { x: 0, y: 0, ...size },
                trim: { x: BLEED, y: BLEED, ...BOOKLET_PAGE },
            },
        ],
    }));
}

/**
 * The booklet for the home printer: two A5 pages side by side on A4 landscape, in the order that folds into a
 * booklet when the sheets are printed on both sides (flip on the short edge) and folded in half.
 */
function bookletHome(): PageSpec[] {
    const size = { w: 2 * BOOKLET_PAGE.w, h: BOOKLET_PAGE.h };

    return bookletSpreads().map(([left, right], index) => {
        const item = (page: number, x: number): PageItem => ({
            id: `booklet.${String(page)}`,
            kind: 'booklet-page',
            elementKey: RULES_BOOKLET_KEY,
            label: `Pagina ${String(page)}`,
            bleed: { x, y: 0, ...BOOKLET_PAGE },
            trim: { x, y: 0, ...BOOKLET_PAGE },
        });

        return {
            size,
            label: `Blad ${String(Math.floor(index / 2) + 1)}, ${index % 2 === 0 ? 'voorkant' : 'achterkant'}`,
            cropMarks: [],
            // Two short ticks on the fold, at the top and the bottom edge.
            foldLines: [
                { x1: BOOKLET_PAGE.w, y1: 0, x2: BOOKLET_PAGE.w, y2: 3 },
                {
                    x1: BOOKLET_PAGE.w,
                    y1: size.h - 3,
                    x2: BOOKLET_PAGE.w,
                    y2: size.h,
                },
            ],
            items: [item(left, 0), item(right, BOOKLET_PAGE.w)],
        };
    });
}

/** The houses, then the hotels: whole A4 sheets with the nets, the same for both sets. */
function foldModels(): PageSpec[] {
    return foldSheets().map((sheet) => ({
        size: A4,
        label: null,
        cropMarks: [],
        foldLines: [],
        items: [
            {
                id: `fold.${sheet.kind}.${String(sheet.number)}.${String(sheet.count)}`,
                kind: 'fold-sheet' as const,
                elementKey: FOLD_MODELS_KEY,
                label: `${sheet.kind} ${String(sheet.number)}`,
                bleed: { x: 0, y: 0, ...A4 },
                trim: { x: 0, y: 0, ...A4 },
            },
        ],
    }));
}

function dice(): PageSpec[] {
    return [
        {
            size: A4,
            label: null,
            cropMarks: [],
            foldLines: [],
            items: [
                {
                    id: 'dice.1',
                    kind: 'dice-sheet',
                    elementKey: DICE_KEY,
                    label: 'Dobbelstenen',
                    bleed: { x: 0, y: 0, ...A4 },
                    trim: { x: 0, y: 0, ...A4 },
                },
            ],
        },
    ];
}

/** One A6 card with bleed for the print shop; four on an A4 sheet for home, divided by dashed lines. */
function invitation(set: PrintSet): PageSpec[] {
    if (set === 'printer') {
        const size = {
            w: INVITATION.w + 2 * BLEED,
            h: INVITATION.h + 2 * BLEED,
        };

        return [
            {
                size,
                label: null,
                cropMarks: [],
                foldLines: [],
                items: [
                    {
                        id: 'invitation.1',
                        kind: 'invitation',
                        elementKey: INVITATION_KEY,
                        label: 'Uitnodiging',
                        bleed: { x: 0, y: 0, ...size },
                        trim: { x: BLEED, y: BLEED, ...INVITATION },
                    },
                ],
            },
        ];
    }

    return [
        {
            size: A4,
            label: null,
            cropMarks: [],
            foldLines: invitationCutLines(),
            items: invitationCells().map((cell, index) => ({
                id: `invitation.${String(index + 1)}`,
                kind: 'invitation' as const,
                elementKey: INVITATION_KEY,
                label: 'Uitnodiging',
                bleed: cell,
                trim: cell,
            })),
        },
    ];
}

function calibration(profile: BoardProfile): PageSpec[] {
    const sheet = calibrationSheet(profile);
    const item = (id: string, rect: Rect, label: string): PageItem => ({
        id,
        kind: 'calibration',
        elementKey: null,
        label,
        bleed: rect,
        trim: rect,
    });

    return [
        {
            size: sheet.page,
            label: 'Proefvel',
            cropMarks: [],
            foldLines: [],
            items: [
                item(
                    'ruler',
                    {
                        x: sheet.ruler.x,
                        y: sheet.ruler.y,
                        w: sheet.ruler.length,
                        h: 8,
                    },
                    'Liniaal 100 mm',
                ),
                item('bank-card', sheet.bankCard, 'Bankpas'),
                item(
                    'corner-space',
                    sheet.cornerSpace,
                    sheet.cornerSpace.label,
                ),
                item(
                    'normal-space',
                    sheet.normalSpace,
                    sheet.normalSpace.label,
                ),
            ],
        },
    ];
}

/**
 * Which element goes on which page and where (B54, B56, B101). The renderer only draws what this returns,
 * so swapping the placeholder renderer for the real ones touches nothing here.
 */
export function composePages(
    part: PrintPart,
    set: PrintSet,
    edition: PrintEdition,
    profile: BoardProfile = DEFAULT_BOARD_PROFILE,
): PageSpec[] {
    switch (part) {
        case 'board':
            return set === 'printer'
                ? boardPrinter(profile)
                : boardHome(profile);
        case 'cards':
            return set === 'printer'
                ? cardsPrinter(edition)
                : cardsHome(edition);
        case 'money':
            return money(set === 'printer' ? 'SRA3' : 'A4');
        case 'tokens':
            return tokens();
        case 'box_lid':
            return boxLid(profile, set);
        case 'rules_booklet':
            return set === 'printer' ? bookletPrinter() : bookletHome();
        case 'fold_models':
            return foldModels();
        case 'dice':
            return dice();
        case 'invitation':
            return invitation(set);
        case 'calibration':
            return calibration(profile);
    }
}
