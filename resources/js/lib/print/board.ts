import { formatMm, type Rect, type Segment, type Size } from './types';

export interface BoardProfile {
    id: string;
    name: string;
    /** Outer size of the (square) board in mm. */
    outer: number;
    /** Corner space size (square) in mm. */
    corner: number;
    /** White rim around the playing area in mm. */
    border: number;
    /** Number of sticker panels for the print shop. */
    panels: 2 | 4;
    /** Box lid size in mm. */
    boxLid: Size;
    /** Measurements not yet taken from a real set (B21). */
    provisional?: boolean;
}

/** PROVISIONAL (B21): measure against a bought set before the renderers are final. */
export const DEFAULT_BOARD_PROFILE: BoardProfile = {
    id: 'modern-square',
    name: 'Modern vierkant',
    outer: 500,
    corner: 70,
    border: 0,
    panels: 4,
    boxLid: { w: 267, h: 267 },
    provisional: true,
};

export const BOARD_PROFILES: readonly BoardProfile[] = [DEFAULT_BOARD_PROFILE];

/** Smallest sensible width of a normal space in mm. */
export const MIN_SPACE_WIDTH = 15;

export type SpaceSide = 'bottom' | 'left' | 'top' | 'right' | 'corner';

export interface SpaceRect extends Rect {
    /** 0 = bottom-right corner (Start), increasing clockwise as on the classic board. */
    position: number;
    side: SpaceSide;
    /** Degrees clockwise to rotate upright artwork so its top points to the board centre. */
    rotation: 0 | 90 | 180 | 270;
}

export function spaceWidth(p: BoardProfile): number {
    return (p.outer - 2 * p.border - 2 * p.corner) / 9;
}

/**
 * The 40 spaces. Coordinates: origin top-left of the board, x right, y down.
 * Position 0 is bottom-right; the bottom row runs right to left (1..9), corner 10 is
 * bottom-left, the left column runs bottom to top (11..19), corner 20 is top-left, the
 * top row runs left to right (21..29), corner 30 is top-right, the right column runs
 * top to bottom (31..39).
 */
export function spaceRects(p: BoardProfile): SpaceRect[] {
    const c = p.corner;
    const sw = spaceWidth(p);
    const x0 = p.border;
    const y0 = p.border;
    const x1 = p.outer - p.border;
    const y1 = p.outer - p.border;
    const out: SpaceRect[] = [];
    const corner = (position: number, x: number, y: number) =>
        out.push({ position, x, y, w: c, h: c, side: 'corner', rotation: 0 });

    corner(0, x1 - c, y1 - c);
    for (let i = 1; i <= 9; i++) {
        out.push({
            position: i,
            x: x1 - c - i * sw,
            y: y1 - c,
            w: sw,
            h: c,
            side: 'bottom',
            rotation: 0,
        });
    }
    corner(10, x0, y1 - c);
    for (let i = 1; i <= 9; i++) {
        out.push({
            position: 10 + i,
            x: x0,
            y: y1 - c - i * sw,
            w: c,
            h: sw,
            side: 'left',
            rotation: 90,
        });
    }
    corner(20, x0, y0);
    for (let i = 1; i <= 9; i++) {
        out.push({
            position: 20 + i,
            x: x0 + c + (i - 1) * sw,
            y: y0,
            w: sw,
            h: c,
            side: 'top',
            rotation: 180,
        });
    }
    corner(30, x1 - c, y0);
    for (let i = 1; i <= 9; i++) {
        out.push({
            position: 30 + i,
            x: x1 - c,
            y: y0 + c + (i - 1) * sw,
            w: c,
            h: sw,
            side: 'right',
            rotation: 270,
        });
    }
    return out;
}

/** The open middle of the board. */
export function centerRect(p: BoardProfile): Rect {
    const o = p.border + p.corner;
    const s = p.outer - 2 * o;
    return { x: o, y: o, w: s, h: s };
}

export interface FoldLine extends Segment {
    orientation: 'vertical' | 'horizontal';
}

/** Fold lines across the full outer size: one vertical, plus one horizontal for 4 panels. */
export function foldLines(p: BoardProfile): FoldLine[] {
    const mid = p.outer / 2;
    const lines: FoldLine[] = [
        { orientation: 'vertical', x1: mid, y1: 0, x2: mid, y2: p.outer },
    ];
    if (p.panels === 4) {
        lines.push({
            orientation: 'horizontal',
            x1: 0,
            y1: mid,
            x2: p.outer,
            y2: mid,
        });
    }
    return lines;
}

type ProfileLocale = 'nl' | 'en';

const PROFILE_PROBLEMS: Record<
    ProfileLocale,
    {
        outer: string;
        corner: string;
        border: string;
        panels: string;
        boxLid: string;
        noRoom: (border: string, outer: string) => string;
        corners: (
            inner: string,
            corner: string,
            each: string,
            min: number,
        ) => string;
        centre: string;
    }
> = {
    nl: {
        outer: 'De buitenmaat van het bord moet groter zijn dan 0 mm.',
        corner: 'De maat van het hoekvak moet groter zijn dan 0 mm.',
        border: 'De rand mag niet negatief zijn.',
        panels: 'Het aantal panelen is 2 of 4.',
        boxLid: 'De maat van het doosdeksel moet groter zijn dan 0 mm.',
        noRoom: (border, outer) =>
            `De rand (${border} mm aan elke kant) laat geen ruimte over op ${outer} mm.`,
        corners: (inner, corner, each, min) =>
            `Hoekvak plus 9 vakken past niet in ${inner} mm: twee hoekvakken van ${corner} mm laten ` +
            `${each} mm per vak over, minimaal ${min} mm nodig.`,
        centre: 'Het midden van het bord valt weg: kies kleinere hoekvakken.',
    },
    en: {
        outer: 'The outer size of the board must be greater than 0 mm.',
        corner: 'The corner size must be greater than 0 mm.',
        border: 'The border cannot be negative.',
        panels: 'The number of panels is 2 or 4.',
        boxLid: 'The box lid size must be greater than 0 mm.',
        noRoom: (border, outer) =>
            `The border (${border} mm on each side) leaves no room on ${outer} mm.`,
        corners: (inner, corner, each, min) =>
            `A corner space plus 9 spaces does not fit in ${inner} mm: two corners of ${corner} mm leave ` +
            `${each} mm per space, and at least ${min} mm is needed.`,
        centre: 'The centre of the board disappears: choose smaller corners.',
    },
};

/** Human-readable problems with a profile, in Dutch by default; empty when it is usable. */
export function validateProfile(
    p: BoardProfile,
    locale: ProfileLocale = 'nl',
): string[] {
    const text = PROFILE_PROBLEMS[locale];
    const errors: string[] = [];
    const positive = (v: number) => Number.isFinite(v) && v > 0;

    if (!positive(p.outer)) errors.push(text.outer);
    if (!positive(p.corner)) errors.push(text.corner);
    if (!Number.isFinite(p.border) || p.border < 0) errors.push(text.border);
    if (p.panels !== 2 && p.panels !== 4) errors.push(text.panels);
    if (!positive(p.boxLid?.w) || !positive(p.boxLid?.h))
        errors.push(text.boxLid);
    if (errors.length > 0) return errors;

    const inner = p.outer - 2 * p.border;
    if (inner <= 0) {
        errors.push(text.noRoom(formatMm(p.border), formatMm(p.outer)));
        return errors;
    }
    if (2 * p.corner + 9 * MIN_SPACE_WIDTH > inner) {
        errors.push(
            text.corners(
                formatMm(inner),
                formatMm(p.corner),
                formatMm((inner - 2 * p.corner) / 9),
                MIN_SPACE_WIDTH,
            ),
        );
    }
    if (inner - 2 * p.corner <= 0) {
        errors.push(text.centre);
    }
    return errors;
}
