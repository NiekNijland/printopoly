import {
    centerRect,
    foldLines,
    type BoardProfile,
} from '@/lib/render/print-board';

/**
 * Where the title, the photo and the logo of the board centre go (B187). The board is printed as panels that meet
 * on a cross of fold lines through the middle, and the two card spots lie on one diagonal. That leaves two free
 * squares on the other diagonal: top right and bottom left. By default everything sits in those squares, so no
 * seam runs through a letter or a face. "Over het midden" is the old place, across the cross.
 */
export type CenterPlace = 'topRight' | 'bottomLeft' | 'middle';

export const CENTER_PLACES: readonly CenterPlace[] = [
    'topRight',
    'bottomLeft',
    'middle',
];

/** Clear paper between a fold line and anything in a free square, in mm. The red band in the editor is 8 mm wide. */
export const FOLD_CLEAR_MM = 6;

/**
 * How far the photo over the whole centre reaches past the centre, in mm (R5-03). A home sticker of the centre
 * has 2.5 mm of bleed past its edge; with less the board colour shows as a strip along the cut.
 */
export const CENTER_PHOTO_BLEED = 3;

/** Clear paper between the edge of the centre and a free square, in mm. */
const EDGE_MM = 6;

/** How far the title moves at an offset of 1 over the middle, as a share of the centre on each axis (B170). */
const TITLE_TRAVEL = 0.12;

/** The diagonal ribbon and the logo are turned this far, along the free diagonal. */
const DIAGONAL = -45;

export interface Square {
    /** Middle of the square in mm from the top left of the centre. */
    cx: number;
    cy: number;
    size: number;
}

/** A box in mm from the top left of the centre, turned around its middle. */
export interface PlacedBox {
    cx: number;
    cy: number;
    w: number;
    h: number;
    rotation: number;
}

export interface CenterLayout {
    /** The area of the title plate, drawn in the frame of the diagonal; `unit` is 1 on a full ribbon of 360 mm. */
    title: PlacedBox & { unit: number };
    /** The photo of "Naam met foto", straight in its own square; `null` over the middle, where it stands on the plate. */
    photo: PlacedBox | null;
    /** The logo; `null` when the centre shows no logo. */
    logo: PlacedBox | null;
}

export interface CenterLayoutOptions {
    mode: 'name' | 'photo' | 'logo';
    place: CenterPlace;
    /** Size of the title ribbon or the logo, 0.5 to 1 (B170). */
    scale: number;
    /** Height of the title over the middle, -1 to 1 (B170); only over the middle. */
    offset: number;
    /** Width over height of the photo or logo as it is shown (after a quarter turn). */
    aspect: number;
    /** The logo lies on the diagonal instead of straight (B187). */
    logoTilt: boolean;
    /** Paper around the photo of "Naam met foto", in mm on each side. */
    frameInset: number;
}

/** The two free squares of the centre, clear of the fold lines, the card spots and the edge. */
export function centerSquares(
    profile: BoardProfile,
): Record<'topRight' | 'bottomLeft', Square> {
    const centre = centerRect(profile);
    const lines = foldLines(profile);
    const vertical = lines.find((line) => line.orientation === 'vertical');
    const horizontal = lines.find((line) => line.orientation === 'horizontal');
    const fx = vertical === undefined ? centre.w / 2 : vertical.x1 - centre.x;
    const fy =
        horizontal === undefined ? centre.h / 2 : horizontal.y1 - centre.y;
    const square = (x0: number, x1: number, y0: number, y1: number) => ({
        cx: (x0 + x1) / 2,
        cy: (y0 + y1) / 2,
        size: Math.max(0, Math.min(x1 - x0, y1 - y0)),
    });

    return {
        topRight: square(
            fx + FOLD_CLEAR_MM,
            centre.w - EDGE_MM,
            EDGE_MM,
            fy - FOLD_CLEAR_MM,
        ),
        bottomLeft: square(
            EDGE_MM,
            fx - FOLD_CLEAR_MM,
            fy + FOLD_CLEAR_MM,
            centre.h - EDGE_MM,
        ),
    };
}

/** The other free square: the photo of "Naam met foto" goes opposite the name. */
export function otherPlace(place: CenterPlace): 'topRight' | 'bottomLeft' {
    return place === 'bottomLeft' ? 'topRight' : 'bottomLeft';
}

/** The largest box of shape `aspect` whose width plus height is at most `sum`, and no larger than `maxW` by `maxH`. */
function boxOf(
    aspect: number,
    sum: number,
    maxW = Infinity,
    maxH = Infinity,
): { w: number; h: number } {
    let h = sum / (1 + aspect);
    h = Math.min(h, maxH, maxW / aspect);

    return { w: h * aspect, h };
}

/**
 * The layout of the centre (B187). In a free square the title ribbon is as large as fits on the diagonal of the
 * square; a turned box of width w and height h needs (w + h) / √2 on each side.
 */
export function centerLayout(
    profile: BoardProfile,
    options: CenterLayoutOptions,
): CenterLayout {
    const centre = centerRect(profile);
    const squares = centerSquares(profile);
    const scale = Math.min(1, Math.max(0.5, options.scale));
    const fullW = centre.w * 0.8;
    const fullH = centre.h * 0.24;
    const baseUnit = centre.w / 360;
    const middle = options.place === 'middle';
    const ownPlace = options.place === 'bottomLeft' ? 'bottomLeft' : 'topRight';
    const aspect =
        Number.isFinite(options.aspect) && options.aspect > 0
            ? options.aspect
            : 1;

    let title: CenterLayout['title'];
    if (middle) {
        const offset = Math.min(1, Math.max(-1, options.offset));
        title = {
            cx: centre.w / 2 + offset * TITLE_TRAVEL * centre.w,
            cy: centre.h / 2 + offset * TITLE_TRAVEL * centre.h,
            w: fullW * scale,
            h: fullH * scale,
            rotation: DIAGONAL,
            unit: baseUnit * scale,
        };
    } else {
        const square = squares[ownPlace];
        const fit = Math.min(1, (square.size * Math.SQRT2) / (fullW + fullH));
        title = {
            cx: square.cx,
            cy: square.cy,
            w: fullW * fit * scale,
            h: fullH * fit * scale,
            rotation: DIAGONAL,
            unit: baseUnit * fit * scale,
        };
    }

    let photo: PlacedBox | null = null;
    if (options.mode === 'photo' && !middle) {
        const square = squares[otherPlace(options.place)];
        // Straight and as large as the free square, with its frame inside it (B216, R5-04): a turned photo was a
        // small card, and faces looked at the players askew.
        const room = Math.max(0, square.size - 2 * options.frameInset);
        const box = boxOf(aspect, Infinity, room, room);
        photo = { cx: square.cx, cy: square.cy, ...box, rotation: 0 };
    }

    let logo: PlacedBox | null = null;
    if (options.mode === 'logo') {
        if (middle) {
            // Straight across the middle the logo stays clear of the card spots; turned it lies on the free diagonal.
            const box = options.logoTilt
                ? boxOf(
                      aspect,
                      Infinity,
                      fullW * 0.78 * scale,
                      100 * baseUnit * scale,
                  )
                : boxOf(aspect, centre.w * 0.66 * scale);
            logo = {
                cx: centre.w / 2,
                cy: centre.h / 2,
                ...box,
                rotation: options.logoTilt ? DIAGONAL : 0,
            };
        } else {
            const square = squares[ownPlace];
            const room = square.size * 0.92 * scale;
            const box = options.logoTilt
                ? boxOf(aspect, room * Math.SQRT2)
                : boxOf(aspect, Infinity, room, room);
            logo = {
                cx: square.cx,
                cy: square.cy,
                ...box,
                rotation: options.logoTilt ? DIAGONAL : 0,
            };
        }
    }

    return { title, photo, logo };
}

/** The four corners of a turned box, in mm from the top left of the centre. */
export function boxCorners(box: PlacedBox): { x: number; y: number }[] {
    const angle = (box.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
    ].map(([sx = 0, sy = 0]) => {
        const dx = (sx * box.w) / 2;
        const dy = (sy * box.h) / 2;

        return {
            x: box.cx + dx * cos - dy * sin,
            y: box.cy + dx * sin + dy * cos,
        };
    });
}

/** Whether a turned box crosses a fold line of the board, with `margin` mm of clear paper on each side. */
export function crossesFold(
    profile: BoardProfile,
    box: PlacedBox,
    margin = FOLD_CLEAR_MM / 2,
): boolean {
    const centre = centerRect(profile);
    const corners = boxCorners(box);
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);

    return foldLines(profile).some((line) => {
        if (line.orientation === 'vertical') {
            const x = line.x1 - centre.x;

            return Math.min(...xs) < x + margin && Math.max(...xs) > x - margin;
        }
        const y = line.y1 - centre.y;

        return Math.min(...ys) < y + margin && Math.max(...ys) > y - margin;
    });
}
