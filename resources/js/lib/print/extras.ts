import type { Rect, Segment, Size } from './types';

/**
 * The extra print items (B123): rules booklet, fold-up houses and hotels, dice nets and the invitation.
 * Geometry and page counts only; the renderers (components/render) and `composePages` read from here, and
 * `app/Print/PrintLayout.php` holds the same numbers as the independent expectation (B107).
 */

export const A4: Size = { w: 210, h: 297 };

/** A booklet page: A5, in portrait. */
export const BOOKLET_PAGE: Size = { w: 148.5, h: 210 };
/** Sixteen pages fold to four A4 sheets, printed on both sides (a multiple of four). */
export const BOOKLET_PAGES = 16;

/** Page numbers, left and right, of each side of a sheet when the booklet is folded in half (A4 landscape). */
export function bookletSpreads(
    pages: number = BOOKLET_PAGES,
): [number, number][] {
    const spreads: [number, number][] = [];

    for (let sheet = 0; sheet < pages / 4; sheet++) {
        spreads.push([pages - 2 * sheet, 2 * sheet + 1]);
        spreads.push([2 * sheet + 2, pages - 2 * sheet - 1]);
    }

    return spreads;
}

/** Number of printed sides of the home booklet (A4 landscape, duplex). */
export const BOOKLET_HOME_SIDES = BOOKLET_PAGES / 2;

export const INVITATION: Size = { w: 105, h: 148 };

export const HOUSES = 32;
export const HOTELS = 12;
export const DICE = 2;

export interface Point {
    x: number;
    y: number;
}

export type FaceRole = 'floor' | 'wall' | 'roof' | 'end' | 'top' | 'tab';

export interface NetFace {
    role: FaceRole;
    points: Point[];
}

export interface Net {
    /** Width and height of everything the net occupies, in mm, from (0, 0). */
    size: Size;
    faces: NetFace[];
    /** Where the artwork sits, in net mm, for the emblem and the decoration. */
    marks: Record<string, Rect>;
}

/** The grey of a glue tab. */
export const TAB_FILL = '#E6E3DA';

const TAB_DEPTH = 3;
const TAB_SLANT = 1.2;

function rect(x: number, y: number, w: number, h: number): Point[] {
    return [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
    ];
}

/** A glue tab on a horizontal edge, pointing up (`dir` -1) or down (+1). */
function horizontalTab(
    x0: number,
    x1: number,
    y: number,
    dir: 1 | -1,
): Point[] {
    return [
        { x: x0, y },
        { x: x1, y },
        { x: x1 - TAB_SLANT, y: y + dir * TAB_DEPTH },
        { x: x0 + TAB_SLANT, y: y + dir * TAB_DEPTH },
    ];
}

/** A glue tab on a vertical edge, pointing right. */
function sideTab(
    x: number,
    y0: number,
    y1: number,
    depth = TAB_DEPTH + 1,
): Point[] {
    return [
        { x, y: y0 },
        { x: x + depth, y: y0 + TAB_SLANT },
        { x: x + depth, y: y1 - TAB_SLANT },
        { x, y: y1 },
    ];
}

/** A house: a pentagonal prism, with the roof, so a little longer than it is wide. */
export const HOUSE = { w: 12, d: 14, wall: 8, rise: 4 } as const;

/**
 * The net of a house. A strip of five rectangles (floor, wall, roof, roof, wall) with the two house-shaped
 * ends attached to the floor, above and below, and glue tabs on the other edges. `front` is the end above
 * the strip: it stands upright as drawn, so the emblem goes there (the other end is drawn upside down in
 * the net and stands up once folded).
 */
export function houseNet(): Net {
    const { w, d, wall, rise } = HOUSE;
    const slope = Math.hypot(w / 2, rise);
    const end = wall + rise;
    const x1 = w + wall;
    const x2 = x1 + slope;
    const x3 = x2 + slope;
    const x4 = x3 + wall;
    const top = end;
    const bottom = top + d;
    const pentagon = (apexUp: boolean): Point[] => {
        // The end that sits above the strip hangs from the floor's top edge, the other from its bottom edge.
        const base = apexUp ? top : bottom;
        const sign = apexUp ? -1 : 1;

        return [
            { x: 0, y: base },
            { x: w, y: base },
            { x: w, y: base + sign * wall },
            { x: w / 2, y: base + sign * end },
            { x: 0, y: base + sign * wall },
        ];
    };
    const faces: NetFace[] = [
        { role: 'floor', points: rect(0, top, w, d) },
        { role: 'wall', points: rect(w, top, wall, d) },
        { role: 'roof', points: rect(x1, top, slope, d) },
        { role: 'roof', points: rect(x2, top, slope, d) },
        { role: 'wall', points: rect(x3, top, wall, d) },
        { role: 'tab', points: sideTab(x4, top, bottom) },
        { role: 'end', points: pentagon(true) },
        { role: 'end', points: pentagon(false) },
    ];
    const spans: [number, number][] = [
        [w, x1],
        [x1, x2],
        [x2, x3],
        [x3, x4],
    ];

    for (const [a, b] of spans) {
        faces.push({ role: 'tab', points: horizontalTab(a, b, top, -1) });
        faces.push({ role: 'tab', points: horizontalTab(a, b, bottom, 1) });
    }

    return {
        size: { w: x4 + TAB_DEPTH + 1, h: bottom + end },
        faces,
        marks: {
            front: { x: 0, y: 0, w, h: end },
            back: { x: 0, y: bottom, w, h: end },
        },
    };
}

/** A hotel: a block, wider than a house. */
export const HOTEL = { w: 24, d: 12, h: 14 } as const;

/**
 * The net of a hotel: a strip of four walls with the roof on top of the first one and glue tabs on the
 * other three roof edges and at the end of the strip.
 */
export function hotelNet(): Net {
    const { w, d, h } = HOTEL;
    const x1 = w;
    const x2 = x1 + d;
    const x3 = x2 + w;
    const x4 = x3 + d;
    const faces: NetFace[] = [
        { role: 'top', points: rect(0, 0, w, d) },
        { role: 'wall', points: rect(0, d, w, h) },
        { role: 'wall', points: rect(x1, d, d, h) },
        { role: 'wall', points: rect(x2, d, w, h) },
        { role: 'wall', points: rect(x3, d, d, h) },
        { role: 'tab', points: sideTab(x4, d, d + h) },
        { role: 'tab', points: horizontalTab(x1, x2, d, -1) },
        { role: 'tab', points: horizontalTab(x2, x3, d, -1) },
        { role: 'tab', points: horizontalTab(x3, x4, d, -1) },
    ];

    return {
        size: { w: x4 + TAB_DEPTH + 1, h: d + h },
        faces,
        marks: {
            roof: { x: 0, y: 0, w, h: d },
            front: { x: 0, y: d, w, h },
            side: { x: x1, y: d, w: d, h },
            back: { x: x2, y: d, w, h },
            side2: { x: x3, y: d, w: d, h },
        },
    };
}

export type FoldKind = 'house' | 'hotel';

const FOLD_MARGIN = 8;
/** Room under the models for the legend. */
const FOLD_FOOTER = 16;
const FOLD_GAP = 2.5;

export interface FoldCell {
    x: number;
    y: number;
}

export function netFor(kind: FoldKind): Net {
    return kind === 'house' ? houseNet() : hotelNet();
}

/** Where the models go on a sheet, row by row. */
export function foldCells(kind: FoldKind): FoldCell[] {
    const net = netFor(kind).size;
    const cols = Math.floor(
        (A4.w - 2 * FOLD_MARGIN + FOLD_GAP) / (net.w + FOLD_GAP) + 1e-9,
    );
    const rows = Math.floor(
        (A4.h - 2 * FOLD_MARGIN - FOLD_FOOTER + FOLD_GAP) / (net.h + FOLD_GAP) +
            1e-9,
    );
    const used = cols * net.w + (cols - 1) * FOLD_GAP;
    const left = (A4.w - used) / 2;
    const cells: FoldCell[] = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            cells.push({
                x: left + col * (net.w + FOLD_GAP),
                y: FOLD_MARGIN + row * (net.h + FOLD_GAP),
            });
        }
    }

    return cells;
}

export interface FoldSheetPlan {
    kind: FoldKind;
    /** 1-based sheet number within its kind. */
    number: number;
    /** Models on this sheet. */
    count: number;
}

/** The sheets for the houses and the hotels: as many houses as fit per sheet, then the hotels. */
export function foldSheets(): FoldSheetPlan[] {
    const plans: FoldSheetPlan[] = [];

    for (const [kind, total] of [
        ['house', HOUSES],
        ['hotel', HOTELS],
    ] as const) {
        const capacity = foldCells(kind).length;
        const sheets = Math.ceil(total / capacity);

        for (let number = 1; number <= sheets; number++) {
            plans.push({
                kind,
                number,
                count: Math.min(capacity, total - (number - 1) * capacity),
            });
        }
    }

    return plans;
}

export const DIE_EDGE = 24;
/** Opposite faces add up to seven. */
export const DIE_LAYOUT = [
    // [column, row, pips]: a cross of six squares around the front face.
    [1, 0, 1],
    [0, 1, 3],
    [1, 1, 2],
    [2, 1, 4],
    [3, 1, 5],
    [1, 2, 6],
] as const;

/** The seven glue tabs of a die net, as [x0, y0, x1, y1, side]: `side` says which way the tab points. */
export function dieNet(edge: number = DIE_EDGE): Net {
    const faces: NetFace[] = DIE_LAYOUT.map(([col, row]) => ({
        role: 'floor' as const,
        points: rect(col * edge, (row + 0) * edge + TAB_DEPTH + 1, edge, edge),
    }));
    const oy = TAB_DEPTH + 1;
    const tab = (points: Point[]): NetFace => ({ role: 'tab', points });

    // Up: the top face's three free sides; down: the bottom face's; and one on the end of the row.
    faces.push(
        tab(horizontalTab(edge, 2 * edge, oy, -1)),
        tab(horizontalTab(edge, 2 * edge, oy + 3 * edge, 1)),
        tab(sideTabLeft(edge, oy, oy + edge)),
        tab(sideTab(2 * edge, oy, oy + edge)),
        tab(sideTabLeft(edge, oy + 2 * edge, oy + 3 * edge)),
        tab(sideTab(2 * edge, oy + 2 * edge, oy + 3 * edge)),
        tab(sideTab(4 * edge, oy + edge, oy + 2 * edge)),
    );

    return {
        size: {
            w: 4 * edge + TAB_DEPTH + 1,
            h: 3 * edge + 2 * (TAB_DEPTH + 1),
        },
        faces,
        marks: {},
    };
}

function sideTabLeft(x: number, y0: number, y1: number): Point[] {
    const depth = TAB_DEPTH + 1;

    return [
        { x, y: y0 },
        { x: x - depth, y: y0 + TAB_SLANT },
        { x: x - depth, y: y1 - TAB_SLANT },
        { x, y: y1 },
    ];
}

/** Bounding box of the pips of one face: positions in a unit square, as fractions. */
export function pipPositions(pips: number): [number, number][] {
    const near = 0.27;
    const far = 0.73;
    const mid = 0.5;
    const corners: Record<number, [number, number][]> = {
        1: [[mid, mid]],
        2: [
            [near, near],
            [far, far],
        ],
        3: [
            [near, near],
            [mid, mid],
            [far, far],
        ],
        4: [
            [near, near],
            [far, near],
            [near, far],
            [far, far],
        ],
        5: [
            [near, near],
            [far, near],
            [mid, mid],
            [near, far],
            [far, far],
        ],
        6: [
            [near, near],
            [far, near],
            [near, mid],
            [far, mid],
            [near, far],
            [far, far],
        ],
    };

    return corners[pips] ?? [];
}

/** Where the two dice sit on their A4 sheet. */
export function dicePlacements(): Point[] {
    const net = dieNet().size;
    const gap = 22;
    const total = DICE * net.h + (DICE - 1) * gap;
    const top = (A4.h - 22 - total) / 2;
    const left = (A4.w - net.w) / 2;

    return Array.from({ length: DICE }, (_, i) => ({
        x: left,
        y: top + i * (net.h + gap),
    }));
}

/** The four A6 invitations on a home sheet (A4 holds four A6 exactly, so there are no margins). */
export function invitationCells(): Rect[] {
    return [0, 1].flatMap((row) =>
        [0, 1].map((col) => ({
            x: col * INVITATION.w,
            y: row * INVITATION.h,
            w: INVITATION.w,
            h: INVITATION.h,
        })),
    );
}

/** The dashed lines that divide the sheet into its four invitations. */
export function invitationCutLines(): Segment[] {
    return [
        { x1: INVITATION.w, y1: 0, x2: INVITATION.w, y2: 2 * INVITATION.h },
        { x1: 0, y1: INVITATION.h, x2: 2 * INVITATION.w, y2: INVITATION.h },
    ];
}

/** Cut lines and fold lines of a net: an edge shared by two faces is a fold, one that is not shared is a cut. */
export function netEdges(net: Net): { cuts: Segment[]; folds: Segment[] } {
    const count = new Map<string, { segment: Segment; n: number }>();
    const key = (value: number) => (Math.round(value * 1000) / 1000).toFixed(3);

    for (const face of net.faces) {
        face.points.forEach((from, index) => {
            const to = face.points[(index + 1) % face.points.length];

            if (to === undefined) {
                return;
            }

            const [a, b] =
                from.x < to.x || (from.x === to.x && from.y <= to.y)
                    ? [from, to]
                    : [to, from];
            const id = `${key(a.x)},${key(a.y)}-${key(b.x)},${key(b.y)}`;
            const found = count.get(id);

            if (found === undefined) {
                count.set(id, {
                    segment: { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
                    n: 1,
                });
            } else {
                found.n += 1;
            }
        });
    }

    const cuts: Segment[] = [];
    const folds: Segment[] = [];

    for (const { segment, n } of count.values()) {
        (n > 1 ? folds : cuts).push(segment);
    }

    return { cuts, folds };
}
