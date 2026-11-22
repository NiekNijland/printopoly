import { SHEET_PRESETS } from './imposition';
import type { Rect, Segment, Size } from './types';

/** Bleed around the lid, as everywhere (B101). */
const BLEED = 3;
/** White room around the art on the A4 sheet, for the crop marks and printers that do not print to the edge. */
export const LID_MARGIN = 10;
/** The strip a piece keeps past its edge, so the next piece lies on it and no seam of white shows. */
export const LID_OVERLAP = 10;

/** One piece of the box lid on its own A4 sheet. */
export interface LidTile {
    /** `box-lid.{column}.{row}`. */
    id: string;
    /** 1-based, in reading order. */
    number: number;
    /** What the sheet shows, in mm of the lid (0,0 is the top left corner of the finished lid). */
    visible: Rect;
    /** Where to cut, in mm of the lid. */
    cut: Rect;
    /** Where the next piece lies on this one (its edge), in mm of the lid: a dashed line. */
    guides: Segment[];
}

export interface LidTiling {
    page: Size;
    tiles: LidTile[];
}

/** How many pieces one side needs, and the length of each. */
function pieces(length: number, room: number): number {
    if (length + 2 * BLEED <= room + 1e-9) {
        return 1;
    }

    return Math.ceil(length / (room - BLEED - LID_OVERLAP) - 1e-9);
}

/** The spans of the pieces along one side: what shows and where to cut. */
function spans(
    length: number,
    count: number,
): { show: [number, number]; cut: [number, number]; edge: number | null }[] {
    const slice = length / count;

    return Array.from({ length: count }, (_, index) => {
        const start = index * slice;
        const end = (index + 1) * slice;
        const last = index === count - 1;

        return {
            show: [start - BLEED, last ? end + BLEED : end + LID_OVERLAP],
            cut: [start, last ? end : end + LID_OVERLAP],
            edge: last ? null : end,
        };
    });
}

/**
 * The box lid for the home printer (R5-29, Fatima, Gerda): on one A4 sheet when it fits, else in pieces of A4 that
 * overlap by {@link LID_OVERLAP} mm. Every piece but the last along a side keeps a strip past its edge with a
 * dashed line; the next piece is cut on its crop marks and laid with its edge on that line, so the picture runs on
 * without a white seam. Portrait sheets unless landscape needs fewer. `App\Print\PrintLayout` counts the same.
 */
export function lidTiles(lid: Size): LidTiling {
    const base = SHEET_PRESETS.A4;
    const options = [base, { w: base.h, h: base.w }].map((page) => {
        const columns = pieces(lid.w, page.w - 2 * LID_MARGIN);
        const rows = pieces(lid.h, page.h - 2 * LID_MARGIN);

        return { page, columns, rows };
    });
    const best = options.reduce((a, b) =>
        b.columns * b.rows < a.columns * a.rows ? b : a,
    );
    const across = spans(lid.w, best.columns);
    const down = spans(lid.h, best.rows);
    const tiles: LidTile[] = [];

    down.forEach((row, rowIndex) => {
        across.forEach((column, columnIndex) => {
            const visible = {
                x: column.show[0],
                y: row.show[0],
                w: column.show[1] - column.show[0],
                h: row.show[1] - row.show[0],
            };
            const guides: Segment[] = [];

            if (column.edge !== null) {
                guides.push({
                    x1: column.edge,
                    y1: visible.y,
                    x2: column.edge,
                    y2: visible.y + visible.h,
                });
            }
            if (row.edge !== null) {
                guides.push({
                    x1: visible.x,
                    y1: row.edge,
                    x2: visible.x + visible.w,
                    y2: row.edge,
                });
            }

            tiles.push({
                id: `box-lid.${String(columnIndex)}.${String(rowIndex)}`,
                number: tiles.length + 1,
                visible,
                cut: {
                    x: column.cut[0],
                    y: row.cut[0],
                    w: column.cut[1] - column.cut[0],
                    h: row.cut[1] - row.cut[0],
                },
                guides,
            });
        });
    });

    return { page: best.page, tiles };
}
