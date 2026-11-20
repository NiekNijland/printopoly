import { foldLines, type BoardProfile } from './board';
import type { Rect, Size } from './types';

export interface PanelOptions {
    /** Gap between panel and board edge (B6/B64). */
    edgeMargin?: number;
    /** Gap between panel and each fold line (B6). */
    foldMargin?: number;
    /** Bleed around the panel (B5). */
    bleed?: number;
}

export interface Panel {
    /** A = top-left, then row by row. */
    id: string;
    col: number;
    row: number;
    /** The board area between fold lines / edges, before margins. */
    region: Rect;
    /** Cut size, in board coordinates. */
    trim: Rect;
    /** Trim plus bleed, in board coordinates: the area the renderer must draw. */
    source: Rect;
    /** Page size in mm (source size). */
    size: Size;
    /** Trim position inside the page. */
    trimOffset: { x: number; y: number };
}

export function splitPanels(profile: BoardProfile, options: PanelOptions = {}): Panel[] {
    const edge = options.edgeMargin ?? 1;
    const fold = options.foldMargin ?? 1;
    const bleed = options.bleed ?? 3;

    const lines = foldLines(profile);
    const xs = [0, ...lines.filter((l) => l.orientation === 'vertical').map((l) => l.x1), profile.outer];
    const ys = [0, ...lines.filter((l) => l.orientation === 'horizontal').map((l) => l.y1), profile.outer];

    const panels: Panel[] = [];
    for (let row = 0; row < ys.length - 1; row++) {
        for (let col = 0; col < xs.length - 1; col++) {
            const left = xs[col] + (col === 0 ? edge : fold);
            const right = xs[col + 1] - (col === xs.length - 2 ? edge : fold);
            const top = ys[row] + (row === 0 ? edge : fold);
            const bottom = ys[row + 1] - (row === ys.length - 2 ? edge : fold);
            const trim = { x: left, y: top, w: right - left, h: bottom - top };
            const source = { x: trim.x - bleed, y: trim.y - bleed, w: trim.w + 2 * bleed, h: trim.h + 2 * bleed };
            panels.push({
                id: String.fromCharCode(65 + panels.length),
                col,
                row,
                region: { x: xs[col], y: ys[row], w: xs[col + 1] - xs[col], h: ys[row + 1] - ys[row] },
                trim,
                source,
                size: { w: source.w, h: source.h },
                trimOffset: { x: bleed, y: bleed },
            });
        }
    }
    return panels;
}
