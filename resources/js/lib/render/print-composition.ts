import {
    BOX_LID_KEY,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    RULES_BOOKLET_KEY,
    deckCardKeys,
    deedKey,
    noteKey,
    pawnKey,
} from '@/lib/render/edition-keys';
import { standardEdition } from '@/lib/render/standard-edition';
import type { Rect, Segment, Size } from '../../types/print';
import { DEFAULT_BOARD_PROFILE, type BoardProfile } from './print-board';
import { calibrationSheet } from './print-calibration';
import {
    A4,
    BOOKLET_PAGE,
    BOOKLET_PAGES,
    INVITATION,
    bookletSpreads,
    invitationCells,
    invitationCutLines,
} from './print-extras';
import { packStickers, stickerPieces } from './print-home-stickers';
import {
    SHEET_PRESETS,
    cropMarksFor,
    duplexCardSheets,
    impose,
    moneySheets,
    printShopCardPages,
    type Imposition,
} from './print-imposition';
import { LID_MARGIN, lidTiles } from './print-lid-tiles';
import { defaultMoneyAmount, isMoneyAmount, noteCounts } from './print-money';
import type { MoneyAmount } from './print-money';
import { splitPanels } from './print-panels';

export type PrintPart =
    | 'board'
    | 'cards'
    | 'money'
    | 'tokens'
    | 'box_lid'
    | 'rules_booklet'
    | 'invitation'
    | 'calibration';

export type PrintSet = 'printer' | 'home';

/** How the print shop delivers the board (B243): sticker panels for your own board, or one whole board. */
type BoardForm = 'panels' | 'whole';

/** The most sets one PDF holds; the same as PrintJob::MAX_COPIES. */
const MAX_SETS = 40;

/** The photo of an element, as the edition stores it, with the crop the server made of it. */
interface PrintPhoto {
    photoId: string;
    /** Signed URL of the pre-cropped JPEG, filled in by the print job. */
    src?: string;
}

interface PrintElement {
    photo?: PrintPhoto;
    [key: string]: unknown;
}

/**
 * The part of an edition the print pipeline needs: the `Edition` of lib/render/edition-types.ts. The elements are
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
    elements: Record<string, PrintElement>;
}

type PageItemKind =
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
    /**
     * The set this item belongs to, when the PDF holds more than one (B242): a card back, a deed or a banknote then
     * carries the mark "SET 2".
     */
    setNumber?: number;
}

export interface PageSpec {
    size: Size;
    label: string | null;
    items: PageItem[];
    cropMarks: Segment[];
    foldLines: Segment[];
}

export const BLEED = 3;
/**
 * Room outside the bleed of a print-shop page for the crop marks (B160). The marks run from the bleed edge to 1 mm
 * before the edge of the page; the server writes the TrimBox and BleedBox at the same distances.
 */
export const MARKS = 6;
export const CARD: Size = { w: 63, h: 88 };
/** One unfolded pawn (PAWN_SIZE_MM of components/render/pawn.tsx; print-document.test.tsx keeps them equal). */
export const TOKEN_SIZE: Size = { w: 40, h: 55 };
const TOKEN_COUNT = 8;

/**
 * The cards to print, in this order: the title deeds, then Chance, then Community Chest, then the house
 * rules card when it is on. The deeds and the decks are those of the standard edition (B100) plus the extra
 * cards the edition added (B135). The cards part always holds all of them: whether it is in the set is chosen on
 * the print page (B198).
 */
export function cardKeys(edition: PrintEdition): string[] {
    const keys: string[] = [];

    for (let i = 1; i <= standardEdition.components.titleDeeds; i++) {
        keys.push(deedKey(i));
    }

    for (const deck of ['chance', 'chest'] as const) {
        keys.push(...deckCardKeys(edition.elements ?? {}, deck));
    }

    // The house rules card is off unless the edition says so (B99), unlike the parts above.
    if (hasHouseRulesCard(edition)) {
        keys.push(HOUSE_RULES_KEY);
    }

    return keys;
}

/**
 * The house rules card prints with the cards when it has a rule on it (B210): the editor always shows it (B198), so
 * the old switch `parts.houseRules` no longer counts. An empty card is left out of the set (bug 20 of test round 3).
 * `PrintEditionData::hasHouseRules` counts the same way.
 */
export function hasHouseRulesCard(edition: {
    elements: Readonly<Record<string, object | undefined>>;
}): boolean {
    const element = edition.elements[HOUSE_RULES_KEY];
    const text =
        element !== undefined && 'text' in element ? element.text : undefined;

    return typeof text === 'string' && text.trim() !== '';
}

/** The amount of play money of a set: the choice the edition or the print page made, else the default (B156). */
export function moneyAmountOf(
    edition: Pick<PrintEdition, 'moneyAmount'>,
    set: PrintSet,
): MoneyAmount {
    return isMoneyAmount(edition.moneyAmount)
        ? edition.moneyAmount
        : defaultMoneyAmount(set);
}

/**
 * The note a banknote index is: every note of the amount, dealt out value by value like cards (1, 5, 10, 20, 50,
 * 100, 500, 1, 5 …), so each sheet carries a mix and the PDF does not open on pages of only 1s (R5-29, Ria).
 */
function noteKeys(amount: MoneyAmount): string[] {
    const left = noteCounts(amount).map((note) => ({ ...note }));
    const keys: string[] = [];

    while (left.some((note) => note.count > 0)) {
        for (const note of left) {
            if (note.count > 0) {
                keys.push(noteKey(note.value));
                note.count -= 1;
            }
        }
    }

    return keys;
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

/**
 * A print-shop page that is one piece with bleed, with room around it for crop marks (B160): the page grows by
 * MARKS on every side and the marks sit in that room, outside the bleed.
 */
function withCropMarks(page: PageSpec): PageSpec {
    const shift = <T extends { x: number; y: number }>(rect: T): T => ({
        ...rect,
        x: rect.x + MARKS,
        y: rect.y + MARKS,
    });
    const items = page.items.map((item) => ({
        ...item,
        bleed: shift(item.bleed),
        trim: shift(item.trim),
    }));

    return {
        ...page,
        size: { w: page.size.w + 2 * MARKS, h: page.size.h + 2 * MARKS },
        items,
        cropMarks: items.flatMap((item) =>
            cropMarksFor(item.trim, BLEED, MARKS - 1),
        ),
    };
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

/**
 * The whole board in one piece for the print shop (B243): one page at full size with 3 mm bleed, for foam board,
 * dibond or a poster.
 */
function boardWhole(profile: BoardProfile): PageSpec[] {
    const size = { w: profile.outer + 2 * BLEED, h: profile.outer + 2 * BLEED };

    return [
        {
            size,
            label: null,
            cropMarks: [],
            foldLines: [],
            items: [
                {
                    id: 'board.whole',
                    kind: 'panel' as const,
                    elementKey: null,
                    label: 'Bord',
                    bleed: { x: 0, y: 0, ...size },
                    trim: {
                        x: BLEED,
                        y: BLEED,
                        w: profile.outer,
                        h: profile.outer,
                    },
                },
            ],
        },
    ];
}

/** The number of sets a PDF holds: at least one, at most MAX_SETS. */
function setsOf(edition: Pick<PrintEdition, 'sets'>): number {
    const sets = edition.sets;

    return typeof sets === 'number' && Number.isFinite(sets)
        ? Math.min(MAX_SETS, Math.max(1, Math.floor(sets)))
        : 1;
}

/**
 * The pages of one set, again for every set (B242): with more than one set every item gets its set number and every
 * page says which set it holds, so a stack that comes off the printer sorts itself.
 */
function perSet(sets: number, pages: () => PageSpec[]): PageSpec[] {
    if (sets < 2) {
        return pages();
    }

    return Array.from({ length: sets }, (_, index) =>
        pages().map((page) => ({
            ...page,
            label:
                page.label === null
                    ? null
                    : `${page.label} · SET ${String(index + 1)}`,
            items: page.items.map((item) => ({
                ...item,
                setNumber: index + 1,
            })),
        })),
    ).flat();
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
function alignmentPages(): PageSpec[] {
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
}

function money(sheet: 'A4' | 'SRA3', amount: MoneyAmount): PageSpec[] {
    const keys = noteKeys(amount);

    return fromImposition(
        moneySheets(undefined, sheet, keys.length),
        'note',
        (index) => ({
            key: keys[index] ?? null,
            label: keys[index] ?? '',
        }),
    );
}

/** The pawns the edition keeps in the set: a pawn taken out has `hidden` (bug 32 of ronde 3). */
export function pawnKeysOf(edition: PrintEdition): string[] {
    return Array.from({ length: TOKEN_COUNT }, (_, i) => pawnKey(i + 1)).filter(
        (key) => edition.elements[key]?.hidden !== true,
    );
}

/** One slot per pawn in the set, so the heading says "Pionnen 1 t/m 5" for five pawns (bug 32 of ronde 3). */
function tokens(edition: PrintEdition): PageSpec[] {
    const keys = pawnKeysOf(edition);

    return fromImposition(
        impose({
            item: TOKEN_SIZE,
            bleed: 0,
            sheet: 'A4',
            margin: 8,
            gap: 3,
            count: Math.max(1, keys.length),
            cropMarks: true,
            labelPrefix: 'Pionnen',
        }),
        'token',
        (index) => ({
            key: keys[index] ?? null,
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

    // At home the lid goes on A4, in pieces that overlap when it is larger (R5-29): nobody needs an A3 printer.
    const { page, tiles } = lidTiles(item);

    return tiles.map((tile) => {
        const shift = (rect: Rect): Rect => ({
            x: rect.x - tile.visible.x + LID_MARGIN,
            y: rect.y - tile.visible.y + LID_MARGIN,
            w: rect.w,
            h: rect.h,
        });
        const shiftSegment = (segment: Segment): Segment => ({
            x1: segment.x1 - tile.visible.x + LID_MARGIN,
            y1: segment.y1 - tile.visible.y + LID_MARGIN,
            x2: segment.x2 - tile.visible.x + LID_MARGIN,
            y2: segment.y2 - tile.visible.y + LID_MARGIN,
        });
        const label =
            tiles.length === 1
                ? 'Doosdeksel'
                : `Doosdeksel deel ${String(tile.number)} van ${String(tiles.length)}`;
        const trim = shift(tile.cut);

        return {
            size: page,
            label,
            cropMarks: cropMarksFor(trim, BLEED, 3),
            foldLines: tile.guides.map(shiftSegment),
            items: [
                {
                    id: tile.id,
                    kind: 'box-lid' as const,
                    elementKey: BOX_LID_KEY,
                    label,
                    bleed: shift(tile.visible),
                    trim,
                },
            ],
        };
    });
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
    // A4 landscape, with the two A5 pages in the middle and the fold exactly halfway.
    const size = { w: A4.h, h: A4.w };
    const fold = size.w / 2;
    const top = (size.h - BOOKLET_PAGE.h) / 2;

    return bookletSpreads().map(([left, right], index) => {
        const item = (page: number, x: number): PageItem => ({
            id: `booklet.${String(page)}`,
            kind: 'booklet-page',
            elementKey: RULES_BOOKLET_KEY,
            label: `Pagina ${String(page)}`,
            bleed: { x, y: top, ...BOOKLET_PAGE },
            trim: { x, y: top, ...BOOKLET_PAGE },
        });

        return {
            size,
            label: `Blad ${String(Math.floor(index / 2) + 1)}, ${index % 2 === 0 ? 'voorkant' : 'achterkant'}`,
            cropMarks: [],
            // Two short ticks on the fold, at the top and the bottom edge.
            foldLines: [
                { x1: fold, y1: 0, x2: fold, y2: 3 },
                { x1: fold, y1: size.h - 3, x2: fold, y2: size.h },
            ],
            items: [item(left, fold - BOOKLET_PAGE.w), item(right, fold)],
        };
    });
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
            if (set === 'home') {
                return boardHome(profile);
            }

            return (
                edition.boardForm === 'whole'
                    ? boardWhole(profile)
                    : boardPrinter(profile)
            ).map(withCropMarks);
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
}
