import {
    formatMm,
    inflate,
    type Rect,
    type Segment,
    type Size,
} from '../../types/print';

export type SheetPreset = 'A4' | 'A3' | 'SRA3';

/** Portrait sizes in mm. */
export const SHEET_PRESETS: Record<SheetPreset, Size> = {
    A4: { w: 210, h: 297 },
    A3: { w: 297, h: 420 },
    SRA3: { w: 320, h: 450 },
};

type Orientation = 'portrait' | 'landscape' | 'auto';

export type ImposeOptions = {
    /** Finished (trim) size of one item. */
    item: Size;
    bleed: number;
    sheet: SheetPreset | Size;
    /** Safe margin around the sheet: nothing, bleed included, is placed in it. */
    margin: number;
    /** Gap between the bleed boxes of neighbouring items. */
    gap: number;
    /** Number of items to place over as many sheets as needed. */
    count: number;
    orientation?: Orientation;
    cropMarks?: boolean;
    /** Defaults to min(gap, 3). Marks start `bleed` away from the trim corner. */
    markLength?: number;
    /** Label for the sheets, e.g. "Kans" gives "Kans 1 t/m 4". */
    labelPrefix?: string;
};

type Slot = {
    /** 0-based item index over all sheets. */
    index: number;
    col: number;
    row: number;
    trim: Rect;
    bleed: Rect;
};

type Sheet = {
    index: number;
    label: string;
    labelPosition: { x: number; y: number };
    items: Slot[];
    cropMarks: Segment[];
    foldLines: Segment[];
};

export type Imposition = {
    sheet: Size;
    orientation: 'portrait' | 'landscape';
    cols: number;
    rows: number;
    perSheet: number;
    sheets: Sheet[];
};

const sheetSize = (sheet: SheetPreset | Size): Size => {
    return typeof sheet === 'string' ? SHEET_PRESETS[sheet] : sheet;
};

const fitCount = (avail: number, slot: number, gap: number): number => {
    return Math.max(0, Math.floor((avail + gap) / (slot + gap) + 1e-9));
};

const capacity = (page: Size, slot: Size, margin: number, gap: number) => {
    const cols = fitCount(page.w - 2 * margin, slot.w, gap);
    const rows = fitCount(page.h - 2 * margin, slot.h, gap);
    return { cols, rows, total: cols * rows };
};

/** "Kans 1 t/m 4", or "Kans 7" for a single item. */
export const sheetLabel = (
    prefix: string | undefined,
    first: number,
    last: number,
): string => {
    const range = first === last ? `${first}` : `${first} t/m ${last}`;
    return prefix ? `${prefix} ${range}` : range;
};

export const cropMarksFor = (
    trim: Rect,
    bleed: number,
    length: number,
): Segment[] => {
    const segs: Segment[] = [];
    for (const [cx, sx] of [
        [trim.x, -1],
        [trim.x + trim.w, 1],
    ] as const) {
        for (const [cy, sy] of [
            [trim.y, -1],
            [trim.y + trim.h, 1],
        ] as const) {
            segs.push({
                x1: cx + sx * bleed,
                y1: cy,
                x2: cx + sx * (bleed + length),
                y2: cy,
            });
            segs.push({
                x1: cx,
                y1: cy + sy * bleed,
                x2: cx,
                y2: cy + sy * (bleed + length),
            });
        }
    }
    return segs;
};

const dedupe = (segs: Segment[]): Segment[] => {
    const seen = new Set<string>();
    const out: Segment[] = [];
    for (const s of segs) {
        const forward = s.x1 + s.y1 <= s.x2 + s.y2;
        const key = (
            forward ? [s.x1, s.y1, s.x2, s.y2] : [s.x2, s.y2, s.x1, s.y1]
        )
            .map((n) => n.toFixed(3))
            .join(',');
        if (!seen.has(key)) {
            seen.add(key);
            out.push(s);
        }
    }
    return out;
};

/** Generic sheet layout for equal items. Throws a Dutch error if not even one item fits. */
export const impose = (options: ImposeOptions): Imposition => {
    const { item, bleed, margin, gap, count } = options;
    const base = sheetSize(options.sheet);
    const slotSize = { w: item.w + 2 * bleed, h: item.h + 2 * bleed };
    const markLength = options.markLength ?? Math.min(gap, 3);
    if (options.cropMarks && margin < markLength) {
        throw new Error(
            `De marge (${formatMm(margin)} mm) is kleiner dan de snijtekens (${formatMm(markLength)} mm).`,
        );
    }

    const candidates = (['portrait', 'landscape'] as const)
        .filter(
            (o) =>
                (options.orientation ?? 'auto') === 'auto' ||
                options.orientation === o,
        )
        .map((o) => {
            const page = o === 'portrait' ? base : { w: base.h, h: base.w };
            return { o, page, ...capacity(page, slotSize, margin, gap) };
        });
    // Best fit; on a tie portrait wins because it is listed first.
    const best = candidates.reduce((a, b) => (b.total > a.total ? b : a));
    if (best.total === 0) {
        throw new Error(
            `Een onderdeel van ${formatMm(slotSize.w)} × ${formatMm(slotSize.h)} mm (met afloop) past niet op ` +
                `${formatMm(base.w)} × ${formatMm(base.h)} mm met ${formatMm(margin)} mm marge.`,
        );
    }

    const { page, cols, rows, total: perSheet } = best;
    const gridW = cols * slotSize.w + (cols - 1) * gap;
    const gridH = rows * slotSize.h + (rows - 1) * gap;
    const ox = (page.w - gridW) / 2;
    const oy = (page.h - gridH) / 2;

    const sheets: Sheet[] = [];
    const sheetCount = Math.ceil(count / perSheet);
    for (let s = 0; s < sheetCount; s++) {
        const first = s * perSheet;
        const last = Math.min(count, first + perSheet) - 1;
        const items: Slot[] = [];
        for (let i = first; i <= last; i++) {
            const k = i - first;
            const col = k % cols;
            const row = Math.floor(k / cols);
            const bleedRect = {
                x: ox + col * (slotSize.w + gap),
                y: oy + row * (slotSize.h + gap),
                w: slotSize.w,
                h: slotSize.h,
            };
            items.push({
                index: i,
                col,
                row,
                bleed: bleedRect,
                trim: inflate(bleedRect, -bleed),
            });
        }
        sheets.push({
            index: s,
            label: sheetLabel(options.labelPrefix, first + 1, last + 1),
            labelPosition: { x: page.w / 2, y: margin / 2 },
            items,
            cropMarks:
                options.cropMarks === false
                    ? []
                    : dedupe(
                          items.flatMap((it) =>
                              cropMarksFor(it.trim, bleed, markLength),
                          ),
                      ),
            foldLines: [],
        });
    }
    return { sheet: page, orientation: best.o, cols, rows, perSheet, sheets };
};

/** Space between two cards on a home sheet; each card bleeds into half of it (B134). */
const DUPLEX_GAP = 3;
/** Length of the crop marks in the margin of a home card sheet. */
const DUPLEX_MARK = 3;

export type DuplexCards = {
    sheet: Size;
    cols: number;
    rows: number;
    perSheet: number;
    /** Bleed around each card: half the gap, so neighbouring bleeds meet. */
    bleed: number;
    /** Front and back page of each sheet, in print order. */
    pages: { front: Sheet; back: Sheet }[];
};

/**
 * Where a box on the front of a portrait sheet lies on the back, after turning the sheet over its long edge:
 * mirrored left to right, at the same height.
 */
export const mirrorX = <T extends Rect>(rect: T, pageWidth: number): T => {
    return { ...rect, x: pageWidth - rect.x - rect.w };
};

const mirrorSegment = (segment: Segment, pageWidth: number): Segment => {
    return {
        x1: pageWidth - segment.x1,
        y1: segment.y1,
        x2: pageWidth - segment.x2,
        y2: segment.y2,
    };
};

/**
 * Crop marks of a grid of cards with a gap between them: only in the margin around the grid, in line with
 * every trim edge, because inside the grid the bleed of the next card is printed.
 */
const gridMarks = (items: Slot[], length: number): Segment[] => {
    if (items.length === 0) {
        return [];
    }

    const left = Math.min(...items.map((it) => it.bleed.x));
    const right = Math.max(...items.map((it) => it.bleed.x + it.bleed.w));
    const top = Math.min(...items.map((it) => it.bleed.y));
    const bottom = Math.max(...items.map((it) => it.bleed.y + it.bleed.h));
    const xs = new Set(
        items.flatMap((it) => [it.trim.x, it.trim.x + it.trim.w]),
    );
    const ys = new Set(
        items.flatMap((it) => [it.trim.y, it.trim.y + it.trim.h]),
    );
    const marks: Segment[] = [];

    for (const x of xs) {
        marks.push({ x1: x, y1: top, x2: x, y2: top - length });
        marks.push({ x1: x, y1: bottom, x2: x, y2: bottom + length });
    }

    for (const y of ys) {
        marks.push({ x1: left, y1: y, x2: left - length, y2: y });
        marks.push({ x1: right, y1: y, x2: right + length, y2: y });
    }

    return dedupe(marks);
};

/**
 * Cards for a home printer that prints both sides (B134): as many 63 x 88 mm cards as fit on A4 portrait
 * (3 x 3), 3 mm apart, each with 1.5 mm bleed so neighbouring bleeds meet. Every sheet is a page of fronts
 * followed by a page of backs, mirrored left to right so that after turning the sheet over its long edge
 * each back lies exactly behind its own front.
 */
export const duplexCardSheets = (
    count: number,
    card: Size = { w: 63, h: 88 },
    labelPrefix?: string,
): DuplexCards => {
    const bleed = DUPLEX_GAP / 2;
    const result = impose({
        item: card,
        bleed,
        sheet: 'A4',
        margin: DUPLEX_MARK + 3,
        gap: 0,
        count,
        orientation: 'portrait',
        cropMarks: false,
        labelPrefix,
    });
    const width = result.sheet.w;

    return {
        sheet: result.sheet,
        cols: result.cols,
        rows: result.rows,
        perSheet: result.perSheet,
        bleed,
        pages: result.sheets.map((front) => {
            const cropMarks = gridMarks(front.items, DUPLEX_MARK);

            return {
                front: { ...front, cropMarks },
                back: {
                    ...front,
                    items: front.items.map((it) => ({
                        ...it,
                        col: result.cols - 1 - it.col,
                        bleed: mirrorX(it.bleed, width),
                        trim: mirrorX(it.trim, width),
                    })),
                    cropMarks: cropMarks.map((s) => mirrorSegment(s, width)),
                },
            };
        }),
    };
};

const DEFAULT_NOTE_SIZE: Size = { w: 130, h: 60 };
const BANKNOTES_TOTAL = 210;

/**
 * Money sheets (B100): 130 x 60 mm notes cut on crop marks, no bleed so that 6 fit on A4
 * landscape and 14 on SRA3 (210 notes: 35 A4 / 15 SRA3). SRA3 uses a 5 mm margin.
 */
export const moneySheets = (
    noteSize: Size = DEFAULT_NOTE_SIZE,
    sheet: SheetPreset = 'A4',
    count: number = BANKNOTES_TOTAL,
    labelPrefix = 'Speelgeld',
): Imposition => {
    return impose({
        item: noteSize,
        bleed: 0,
        sheet,
        margin: sheet === 'SRA3' ? 5 : 8,
        gap: 3,
        count,
        cropMarks: true,
        labelPrefix,
    });
};

type CardSide = 'front' | 'back';

export type CardPage = {
    /** 0-based page number. */
    page: number;
    /** 0-based card number. */
    card: number;
    side: CardSide;
    size: Size;
    bleed: Rect;
    trim: Rect;
};

/** Print shop cards (B56): one card per page, 63 x 88 mm plus bleed, front and back alternating, no crop marks. */
export const printShopCardPages = (
    cardCount: number,
    card: Size = { w: 63, h: 88 },
    bleed = 3,
): CardPage[] => {
    const size = { w: card.w + 2 * bleed, h: card.h + 2 * bleed };
    const pages: CardPage[] = [];
    for (let c = 0; c < cardCount; c++) {
        for (const side of ['front', 'back'] as const) {
            pages.push({
                page: pages.length,
                card: c,
                side,
                size,
                bleed: { x: 0, y: 0, ...size },
                trim: { x: bleed, y: bleed, w: card.w, h: card.h },
            });
        }
    }
    return pages;
};
