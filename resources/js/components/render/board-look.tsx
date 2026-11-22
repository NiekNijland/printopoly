import type { ReactNode } from 'react';

import type { BoardStyle } from '@/lib/edition/part-styles';
import { mix } from '@/lib/render/color';
import { partStyleOf } from '@/lib/render/style';
import { PLAYFAIR, SPARTAN, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { usesCaps } from './caps';
import { useRender } from './sheet';

/**
 * The look of the spaces and corners of the board in the style the edition chose for the board (B268), on top of
 * its theme. Every style keeps the colours of the theme (ink, accents, deck and group colours) and only the fonts
 * the print page loads (League Spartan 800, Playfair Display 700, Instrument Sans). Absent is the theme's own look
 * (B266), drawn exactly as before.
 *
 * - Vintage: cream paper, a fine double rule inside every space like an engraved banknote, a hatched colour band,
 *   Playfair in spaced capitals and the price in a cut-corner cartouche.
 * - Modern: flat colour blocks, the name large inside the band, a heavy price with a short bar, no ornaments.
 * - Speels (playful): rounded tiles with a hand-drawn edge on the board colour, a scalloped awning for the band,
 *   names as typed and the price on a pill.
 */
export interface BoardLook {
    style: BoardStyle | undefined;
    /** The letters of names (streets, corners): as `FitText` props. */
    name: TextLook;
    /** The letters of prices, amounts and short lines. */
    figure: TextLook;
}

/** Font props for `FitText`. */
interface TextLook {
    font: 'heading' | 'body';
    family?: string;
    weight?: number;
    caps: boolean;
    letterSpacingEm?: number;
}

export function boardLookOf(
    theme: Theme,
    style: BoardStyle | undefined,
): BoardLook {
    switch (style) {
        case 'vintage':
            return {
                style,
                name: {
                    font: 'heading',
                    family: PLAYFAIR,
                    weight: 700,
                    caps: true,
                    letterSpacingEm: 0.04,
                },
                figure: {
                    font: 'heading',
                    family: PLAYFAIR,
                    weight: 700,
                    caps: false,
                },
            };
        case 'modern':
            return {
                style,
                name: {
                    font: 'heading',
                    family: SPARTAN,
                    weight: 800,
                    caps: true,
                    letterSpacingEm: -0.01,
                },
                figure: {
                    font: 'heading',
                    family: SPARTAN,
                    weight: 800,
                    caps: false,
                },
            };
        case 'playful':
            return {
                style,
                name: {
                    font: 'heading',
                    family: SPARTAN,
                    weight: 800,
                    caps: false,
                },
                figure: {
                    font: 'heading',
                    family: SPARTAN,
                    weight: 800,
                    caps: false,
                },
            };
        case undefined:
            return {
                style,
                name: { font: 'heading', caps: usesCaps(theme) },
                figure: { font: 'body', weight: 600, caps: false },
            };
    }
}

/** The board look of the edition being drawn, from the render context. */
export function useBoardLook(): BoardLook {
    const { theme, style } = useRender();

    return boardLookOf(theme, partStyleOf(style, 'board'));
}

/** The cream of Vintage paper, mixed into the colours of the theme so every theme keeps its own tint. */
export const CREAM = '#F1E6C8';

/** The paper of a space in a style: the theme's colour, warmed to cream in Vintage, a clean paper in Modern. */
export function spacePaper(
    theme: Theme,
    style: BoardStyle | undefined,
    base: string,
): string {
    switch (style) {
        case 'vintage':
            return mix(base, CREAM, 0.75);
        case 'modern':
            return base === theme.boardBackground ? theme.paper : base;
        case 'playful':
        case undefined:
            return base;
    }
}

/** The colour of the fine rules of Vintage: the accent of the theme, softened so the rules read as engraving. */
export function ruleColor(theme: Theme): string {
    return mix(theme.accent, theme.ink, 0.25);
}

/** The space between the tile of Speels and the edge of its space. */
export const TILE_GAP = 0.9;

/** The corner radius of a tile of Speels. */
export const TILE_RADIUS = 2.6;

/** The inset of the double rule of Vintage. */
export const RULE_INSET = 1.3;

function Svg({
    x,
    y,
    w,
    h,
    slot,
    clip = false,
    children,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    slot: string;
    clip?: boolean;
    children: ReactNode;
}) {
    return (
        <svg
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: mm(w),
                height: mm(h),
                overflow: clip ? 'hidden' : 'visible',
            }}
            viewBox={`0 0 ${String(w)} ${String(h)}`}
            aria-hidden="true"
            data-slot={slot}
        >
            {children}
        </svg>
    );
}

/**
 * The double rule of Vintage: a line and a hairline inside it, like the frame of an engraved banknote, with a
 * small diamond in each corner when `ornaments` is on (the corners of the board).
 */
export function VintageRules({
    w,
    h,
    color,
    inset = RULE_INSET,
    ornaments = false,
}: {
    w: number;
    h: number;
    color: string;
    inset?: number;
    ornaments?: boolean;
}) {
    const inner = inset + 0.75;
    const d = 1.1;

    return (
        <Svg x={0} y={0} w={w} h={h} slot="vintage-rules">
            <rect
                x={inset}
                y={inset}
                width={Math.max(0, w - 2 * inset)}
                height={Math.max(0, h - 2 * inset)}
                fill="none"
                stroke={color}
                strokeWidth={0.32}
            />
            <rect
                x={inner}
                y={inner}
                width={Math.max(0, w - 2 * inner)}
                height={Math.max(0, h - 2 * inner)}
                fill="none"
                stroke={color}
                strokeWidth={0.12}
            />
            {ornaments &&
                [
                    [inset, inset],
                    [w - inset, inset],
                    [w - inset, h - inset],
                    [inset, h - inset],
                ].map(([cx = 0, cy = 0]) => (
                    <path
                        key={`${String(cx)}-${String(cy)}`}
                        d={`M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`}
                        fill={color}
                    />
                ))}
        </Svg>
    );
}

/** Fine diagonal lines over a box, the shading of an engraving. */
export function Hatch({
    x,
    y,
    w,
    h,
    color,
    spacing = 0.6,
    strokeMm = 0.1,
    opacity = 0.45,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    spacing?: number;
    strokeMm?: number;
    opacity?: number;
}) {
    const lines: string[] = [];
    for (let offset = -h; offset < w; offset += spacing) {
        lines.push(
            `M${offset.toFixed(2)} ${h.toFixed(2)}L${(offset + h).toFixed(2)} 0`,
        );
    }

    return (
        <Svg x={x} y={y} w={w} h={h} slot="hatch" clip>
            <path
                d={lines.join('')}
                stroke={color}
                strokeWidth={strokeMm}
                strokeOpacity={opacity}
                fill="none"
            />
        </Svg>
    );
}

/** A small seeded random, so a hand-drawn edge is the same on screen and in every print. */
export function seeded(seed: number): () => number {
    let state = (seed * 2654435761) >>> 0 || 1;

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * The outline of a rounded rectangle drawn by hand: points along the edge, each moved a little in or out, joined by
 * smooth curves. `seed` keeps it the same for one space.
 */
export function wobblyRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    seed: number,
    amp = 0.22,
): string {
    const random = seeded(seed);
    const points: [number, number][] = [];
    const radius = Math.min(r, w / 2, h / 2);
    const side = (x1: number, y1: number, x2: number, y2: number) => {
        const length = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(1, Math.round(length / 6));
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            points.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
        }
    };
    const arc = (cx: number, cy: number, from: number) => {
        for (let i = 0; i < 3; i++) {
            const angle = from + (Math.PI / 2) * (i / 3);
            points.push([
                cx + radius * Math.cos(angle),
                cy + radius * Math.sin(angle),
            ]);
        }
    };
    side(x + radius, y, x + w - radius, y);
    arc(x + w - radius, y + radius, -Math.PI / 2);
    side(x + w, y + radius, x + w, y + h - radius);
    arc(x + w - radius, y + h - radius, 0);
    side(x + w - radius, y + h, x + radius, y + h);
    arc(x + radius, y + h - radius, Math.PI / 2);
    side(x, y + h - radius, x, y + radius);
    arc(x + radius, y + radius, Math.PI);

    const centre: [number, number] = [x + w / 2, y + h / 2];
    const moved = points.map(([px, py]): [number, number] => {
        const dx = px - centre[0];
        const dy = py - centre[1];
        const length = Math.hypot(dx, dy) || 1;
        const push = (random() - 0.5) * 2 * amp;

        return [px + (dx / length) * push, py + (dy / length) * push];
    });
    const mid = (a: [number, number], b: [number, number]) =>
        `${((a[0] + b[0]) / 2).toFixed(2)} ${((a[1] + b[1]) / 2).toFixed(2)}`;
    const at = (index: number) =>
        moved[(index + moved.length) % moved.length] ?? centre;
    let d = `M${mid(at(-1), at(0))}`;
    for (let i = 0; i < moved.length; i++) {
        const point = at(i);
        d += `Q${point[0].toFixed(2)} ${point[1].toFixed(2)} ${mid(point, at(i + 1))}`;
    }

    return `${d}Z`;
}

/** The tile of Speels: a rounded paper tile with a hand-drawn ink edge, set off the board colour around it. */
export function PlayfulTile({
    w,
    h,
    fill,
    ink,
    seed,
}: {
    w: number;
    h: number;
    fill: string;
    ink: string;
    seed: number;
}) {
    return (
        <Svg x={0} y={0} w={w} h={h} slot="tile">
            <path
                d={wobblyRect(
                    TILE_GAP,
                    TILE_GAP,
                    w - 2 * TILE_GAP,
                    h - 2 * TILE_GAP,
                    TILE_RADIUS,
                    seed,
                )}
                fill={fill}
                stroke={ink}
                strokeWidth={0.4}
                strokeLinejoin="round"
            />
        </Svg>
    );
}

/** The colour band of a street in Speels: a shop awning with rounded top corners and a scalloped edge. */
export function AwningBand({
    x,
    y,
    w,
    h,
    color,
    ink,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    ink: string;
}) {
    const r = Math.min(1.8, h / 3);
    const count = Math.max(3, Math.round(w / 4.2));
    const bump = w / count;
    const bottom = h - bump / 2;
    let d = `M0 ${r}Q0 0 ${r} 0L${w - r} 0Q${w} 0 ${w} ${r}L${w} ${bottom}`;
    for (let i = count - 1; i >= 0; i--) {
        d += `A${bump / 2} ${bump / 2} 0 0 1 ${(i * bump).toFixed(3)} ${bottom.toFixed(3)}`;
    }
    d += 'Z';

    return (
        <Svg x={x} y={y} w={w} h={h} slot="color-bar">
            <path
                d={d}
                fill={color}
                stroke={ink}
                strokeWidth={0.35}
                strokeLinejoin="round"
            />
            <path
                d={`M${r} ${(h * 0.18).toFixed(2)}L${w - r} ${(h * 0.18).toFixed(2)}`}
                stroke="#FFFFFF"
                strokeOpacity={0.45}
                strokeWidth={0.5}
                strokeLinecap="round"
            />
        </Svg>
    );
}

/** A label with cut corners and a double line, the price plate of Vintage. */
export function Cartouche({
    x,
    y,
    w,
    h,
    color,
    fill,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    fill: string;
}) {
    const cut = Math.min(1.4, h / 3);
    const path = (i: number) => {
        const c = cut;
        const x0 = i;
        const y0 = i;
        const x1 = w - i;
        const y1 = h - i;

        return `M${x0 + c} ${y0}L${x1 - c} ${y0}L${x1} ${y0 + c}L${x1} ${y1 - c}L${x1 - c} ${y1}L${x0 + c} ${y1}L${x0} ${y1 - c}L${x0} ${y0 + c}Z`;
    };

    return (
        <Svg x={x} y={y} w={w} h={h} slot="cartouche">
            <path
                d={path(0.16)}
                fill={fill}
                stroke={color}
                strokeWidth={0.32}
            />
            <path
                d={path(0.75)}
                fill="none"
                stroke={color}
                strokeWidth={0.12}
            />
        </Svg>
    );
}

/** A rounded pill, the price sticker of Speels; dashed for the amount of a tax space. */
export function Pill({
    x,
    y,
    w,
    h,
    fill,
    ink,
    dashed = false,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    fill: string;
    ink: string;
    dashed?: boolean;
}) {
    return (
        <Svg x={x} y={y} w={w} h={h} slot="pill">
            <rect
                x={0.2}
                y={0.2}
                width={w - 0.4}
                height={h - 0.4}
                rx={(h - 0.4) / 2}
                fill={fill}
                stroke={ink}
                strokeWidth={0.35}
                strokeDasharray={dashed ? '1.1 0.8' : undefined}
                strokeLinecap="round"
            />
        </Svg>
    );
}

/** A quarter disc in the outer corner of a corner space, the flat colour block of Modern. */
export function QuarterDisc({
    size,
    radius,
    color,
}: {
    size: number;
    radius: number;
    color: string;
}) {
    return (
        <Svg x={0} y={0} w={size} h={size} slot="quarter" clip>
            <circle cx={size} cy={size} r={radius} fill={color} />
        </Svg>
    );
}

/**
 * Confetti in the free tips of a corner space, the small fun of Speels: dots, rings and short strokes in the colours
 * of the theme. The text runs across the diagonal in the middle, so the inner point (top left) and the outer corner
 * (bottom right) stay free.
 */
export function Confetti({
    size,
    colors,
    seed,
    outer = true,
}: {
    size: number;
    colors: readonly string[];
    seed: number;
    /** Also the outer corner; Start keeps it free for its arrow. */
    outer?: boolean;
}) {
    const random = seeded(seed + 101);
    const pieces: ReactNode[] = [];
    // Fixed spots in the inner tip (and mirrored in the outer one), each moved a little: spread out, never on the
    // text across the middle of the diagonal.
    const spots: [number, number][] = [
        [0.09, 0.09],
        [0.24, 0.07],
        [0.08, 0.25],
        [0.36, 0.08],
        [0.08, 0.37],
        [0.2, 0.2],
    ];
    const places = [
        ...spots,
        ...(outer
            ? spots.map(([x, y]): [number, number] => [1 - x, 1 - y])
            : []),
    ];
    places.forEach(([fx, fy], index) => {
        const px = (fx + (random() - 0.5) * 0.04) * size;
        const py = (fy + (random() - 0.5) * 0.04) * size;
        const color = colors[index % colors.length] ?? '#000000';
        const kind = (index + Math.floor(random() * 3)) % 3;
        const s = size * (0.016 + random() * 0.01);
        const turn = random() * 180;
        pieces.push(
            kind === 0 ? (
                <circle key={index} cx={px} cy={py} r={s} fill={color} />
            ) : kind === 1 ? (
                <circle
                    key={index}
                    cx={px}
                    cy={py}
                    r={s * 0.9}
                    fill="none"
                    stroke={color}
                    strokeWidth={s * 0.5}
                />
            ) : (
                <path
                    key={index}
                    d={`M${px - s * 1.4} ${py}L${px + s * 1.4} ${py}`}
                    transform={`rotate(${turn.toFixed(0)} ${px} ${py})`}
                    stroke={color}
                    strokeWidth={s * 0.8}
                    strokeLinecap="round"
                />
            ),
        );
    });

    return (
        <Svg x={0} y={0} w={size} h={size} slot="confetti">
            {pieces}
        </Svg>
    );
}
