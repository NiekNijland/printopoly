import { centerRect, foldLines, spaceRects, type BoardProfile } from './board';
import { SHEET_PRESETS } from './imposition';
import { at, formatMm, inflate, type Rect, type Size } from './types';

export interface StickerOptions {
    /** Each sticker is this much smaller than the space on every side (B7/B65). */
    inset?: number;
    bleed?: number;
}

export interface StickerPiece {
    id: string;
    kind: 'space' | 'center';
    /** Space position 0..39 for spaces. */
    position?: number;
    /** Cut size in board coordinates. */
    trim: Rect;
    /** Trim plus bleed: the area to render. */
    source: Rect;
    size: Size;
}

function piece(
    id: string,
    kind: StickerPiece['kind'],
    region: Rect,
    o: Required<StickerOptions>,
    position?: number,
): StickerPiece {
    const trim = inflate(region, -o.inset);
    const source = inflate(trim, o.bleed);
    return {
        id,
        kind,
        position,
        trim,
        source,
        size: { w: source.w, h: source.h },
    };
}

/** 40 space stickers plus the centre in 4 pieces split along the fold lines. */
export function stickerPieces(
    profile: BoardProfile,
    options: StickerOptions = {},
): StickerPiece[] {
    const o = { inset: options.inset ?? 0.5, bleed: options.bleed ?? 3 };
    const pieces = spaceRects(profile).map((s) =>
        piece(
            `space.${String(s.position).padStart(2, '0')}`,
            'space',
            s,
            o,
            s.position,
        ),
    );

    const c = centerRect(profile);
    const mid = at(foldLines(profile), 0).x1; // board is square: same value for the horizontal fold
    const names = [
        ['tl', 'tr'],
        ['bl', 'br'],
    ];
    const xs = [c.x, mid, c.x + c.w];
    const ys = [c.y, mid, c.y + c.h];
    for (let r = 0; r < 2; r++) {
        for (let col = 0; col < 2; col++) {
            const region = {
                x: at(xs, col),
                y: at(ys, r),
                w: at(xs, col + 1) - at(xs, col),
                h: at(ys, r + 1) - at(ys, r),
            };
            pieces.push(
                piece(`center.${at(at(names, r), col)}`, 'center', region, o),
            );
        }
    }
    return pieces;
}

export interface StickerPackOptions {
    sheet?: Size;
    margin?: number;
    gap?: number;
}

interface Placement {
    id: string;
    /** Bleed box on the sheet; w/h already reflect rotation. */
    x: number;
    y: number;
    w: number;
    h: number;
    /** Artwork is rotated a quarter turn clockwise on the sheet. */
    rotated: boolean;
}

export interface StickerSheet {
    index: number;
    placements: Placement[];
}

interface Shelf {
    y: number;
    h: number;
    x: number;
}

/** Deterministic shelf packing onto A4 sticker sheets; throws if a piece (with bleed) cannot fit. */
export function packStickers(
    pieces: StickerPiece[],
    options: StickerPackOptions = {},
): StickerSheet[] {
    const page = options.sheet ?? SHEET_PRESETS.A4;
    const margin = options.margin ?? 8;
    const gap = options.gap ?? 3;
    const uw = page.w - 2 * margin;
    const uh = page.h - 2 * margin;

    const oriented = pieces.map((p) => {
        const wide = p.size.w >= p.size.h;
        const w = wide ? p.size.w : p.size.h;
        const h = wide ? p.size.h : p.size.w;
        const choices = [
            { w, h, rotated: !wide },
            { w: h, h: w, rotated: wide },
        ];
        const fit = choices.find((c) => c.w <= uw + 1e-9 && c.h <= uh + 1e-9);
        if (!fit) {
            throw new Error(
                `Stikker "${p.id}" van ${formatMm(p.size.w)} × ${formatMm(p.size.h)} mm (met afloop) past niet op een vel van ` +
                    `${formatMm(page.w)} × ${formatMm(page.h)} mm met ${formatMm(margin)} mm marge.`,
            );
        }
        return { id: p.id, ...fit };
    });
    oriented.sort((a, b) => b.h - a.h || b.w - a.w || a.id.localeCompare(b.id));

    const sheets: { shelves: Shelf[]; placements: Placement[] }[] = [];
    for (const it of oriented) {
        let placed = false;
        for (const sheet of sheets) {
            const shelf = sheet.shelves.find(
                (s) => it.h <= s.h + 1e-9 && s.x + it.w <= uw + 1e-9,
            );
            if (shelf) {
                sheet.placements.push({
                    id: it.id,
                    x: margin + shelf.x,
                    y: margin + shelf.y,
                    w: it.w,
                    h: it.h,
                    rotated: it.rotated,
                });
                shelf.x += it.w + gap;
                placed = true;
                break;
            }
            const last = sheet.shelves[sheet.shelves.length - 1];
            const y = last ? last.y + last.h + gap : 0;
            if (y + it.h <= uh + 1e-9) {
                sheet.shelves.push({ y, h: it.h, x: it.w + gap });
                sheet.placements.push({
                    id: it.id,
                    x: margin,
                    y: margin + y,
                    w: it.w,
                    h: it.h,
                    rotated: it.rotated,
                });
                placed = true;
                break;
            }
        }
        if (!placed) {
            sheets.push({
                shelves: [{ y: 0, h: it.h, x: it.w + gap }],
                placements: [
                    {
                        id: it.id,
                        x: margin,
                        y: margin,
                        w: it.w,
                        h: it.h,
                        rotated: it.rotated,
                    },
                ],
            });
        }
    }
    return sheets.map((s, index) => ({ index, placements: s.placements }));
}
