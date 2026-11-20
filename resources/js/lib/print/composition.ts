import {
    BOX_LID_KEY,
    cardKey,
    deedKey,
    noteKey,
    pawnKey,
} from '@/lib/edition/keys';
import { standardEdition } from '@/lib/game/standard-edition';
import { DEFAULT_BOARD_PROFILE, type BoardProfile } from './board';
import { calibrationSheet } from './calibration';
import { packStickers, stickerPieces } from './home-stickers';
import {
    SHEET_PRESETS,
    cropMarksFor,
    foldCardSheets,
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
 * edition, not from the keys.
 */
export interface PrintEdition {
    name?: string;
    language?: string;
    theme?: string;
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
    | 'fold-card'
    | 'note'
    | 'token'
    | 'box-lid'
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
export const TOKEN_SIZE: Size = { w: 30, h: 55 };
export const TOKEN_COUNT = 8;

function on(edition: PrintEdition, part: string): boolean {
    return edition.parts?.[part] !== false;
}

/**
 * The cards to print, in this order: the title deeds, then Chance, then Community Chest. The deeds and the
 * decks are those of the standard edition (B100), each only when its part is on (B99).
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
            for (let i = 1; i <= standardEdition.decks[deck].length; i++) {
                keys.push(cardKey(deck, i));
            }
        }
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

function cardsHome(edition: PrintEdition): PageSpec[] {
    const keys = cardKeys(edition);

    return fromImposition(
        foldCardSheets(keys.length, 'Kaarten'),
        'fold-card',
        (index) => ({ key: keys[index] ?? null, label: keys[index] ?? '' }),
    );
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
        case 'calibration':
            return calibration(profile);
    }
}
