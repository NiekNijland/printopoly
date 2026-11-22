import type { CSSProperties, ReactNode } from 'react';

import type { BoxLidStyle, PawnStyle } from '@/lib/edition/part-styles';
import { mix } from '@/lib/render/color';
import { PLAYFAIR, SPARTAN, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { CREAM, seeded } from './board-look';

/**
 * The drawing parts of the pawn and box lid styles (B268, B271): the same three styles as the board, so a set in
 * one style looks like one set. Colours always come from the theme; only the fonts the print page loads.
 *
 * - Vintage: cream paper, a fine double rule, guilloche (the fine rings and waves of an engraved banknote) and
 *   Playfair in spaced capitals.
 * - Modern: flat colour blocks in the theme's strongest colour, League Spartan in big capitals, no ornaments.
 * - Speels (playful): rounded, a scalloped edge, a stitched line, tape and confetti in the street colours.
 */
export type PieceStyle = PawnStyle | BoxLidStyle;

/** Font props for `FitText` in a style: the name, or a smaller line (subtitle, the word under a pawn). */
export interface PieceText {
    family?: string;
    weight?: number;
    caps?: boolean;
    letterSpacingEm?: number;
}

export function pieceText(
    style: PieceStyle | undefined,
    role: 'name' | 'line',
): PieceText {
    switch (style) {
        case 'vintage':
            return {
                family: PLAYFAIR,
                weight: 700,
                caps: true,
                letterSpacingEm: role === 'name' ? 0.06 : 0.16,
            };
        case 'modern':
            return {
                family: SPARTAN,
                weight: 800,
                caps: true,
                letterSpacingEm: role === 'name' ? -0.01 : 0.05,
            };
        case 'playful':
            return { family: SPARTAN, weight: 800 };
        case undefined:
            return {};
    }
}

/** The colour of a flat block in Modern: the accent, or the second accent when the accent is the ink (Klassiek). */
export function blockColor(theme: Theme): string {
    return theme.accent === theme.ink ? theme.secondaryAccent : theme.accent;
}

/** Vintage paper: the colour of the theme, warmed to cream so every theme keeps its own tint. */
export function vintagePaper(base: string, amount = 0.6): string {
    return mix(base, CREAM, amount);
}

/** A number from a text, so a hand-drawn edge or confetti is the same for one pawn on screen and in print. */
export function seedOf(text: string): number {
    let hash = 7;
    for (const char of text) {
        hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
    }

    return hash % 997;
}

/** An SVG in mm at a place on its element, with its own viewBox in mm. */
export function Art({
    x,
    y,
    w,
    h,
    slot,
    clip = false,
    style,
    children,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    slot?: string;
    clip?: boolean;
    style?: CSSProperties;
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
                ...style,
            }}
            viewBox={`0 0 ${String(w)} ${String(h)}`}
            aria-hidden="true"
            data-slot={slot}
        >
            {children}
        </svg>
    );
}

/** A small diamond, the ornament of Vintage. */
export function diamond(cx: number, cy: number, d: number): string {
    return `M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`;
}

/**
 * The fine overlapping rings behind the medallion of a banknote: rings around the corners and the middle of a grid
 * of small tiles, over a box of `w` by `h` mm. Plain circles, no SVG pattern: Chrome prints a pattern as a blurry
 * picture, a circle stays a sharp line. Draw it in an SVG that clips, such as `Art` with `clip`.
 */
export function GuillocheRings({
    w,
    h,
    color,
    size = 3,
    strokeMm = 0.07,
}: {
    w: number;
    h: number;
    color: string;
    size?: number;
    strokeMm?: number;
}) {
    const centres: [number, number][] = [];
    for (let y = 0; y <= h + size; y += size) {
        for (let x = 0; x <= w + size; x += size) {
            centres.push([x, y]);
            centres.push([x + size / 2, y + size / 2]);
        }
    }

    return (
        <g fill="none" stroke={color} strokeWidth={strokeMm}>
            {centres.flatMap(([cx, cy]) =>
                [0.25, 0.5, 0.75].map((f) => (
                    <circle
                        key={`${cx.toFixed(2)}-${cy.toFixed(2)}-${String(f)}`}
                        cx={cx}
                        cy={cy}
                        r={size * f}
                    />
                )),
            )}
        </g>
    );
}

/**
 * One wave of the rope of a banknote border along x, from `from` to `to`, around the line `y`: arcs of `period / 2`
 * that swing `amplitude` up and down, shifted by `phase` (0 to 1) of a period.
 */
export function wavePath(
    from: number,
    to: number,
    y: number,
    amplitude: number,
    period: number,
    phase: number,
): string {
    const half = period / 2;
    const start = from - half * 2 + phase * period;
    // A quadratic arc to the middle line and back: the control point is twice the height of the arc.
    let d = `M${start.toFixed(3)} ${y.toFixed(3)}Q${(start + half / 2).toFixed(3)} ${(y - 2 * amplitude).toFixed(3)} ${(start + half).toFixed(3)} ${y.toFixed(3)}`;
    for (let x = start + period; x <= to + half; x += half) {
        d += `T${x.toFixed(3)} ${y.toFixed(3)}`;
    }

    return d;
}

/**
 * The rope of a banknote border in a straight band of `length` by `band` mm, running along x: three waves out of
 * step and a hairline through the middle. Turn it with a transform for a side.
 */
export function Rope({
    length,
    band,
    color,
    period = 4,
}: {
    length: number;
    band: number;
    color: string;
    period?: number;
}) {
    const amplitude = (band / 2 - 0.35) * 0.98;

    return (
        <svg
            x={0}
            y={0}
            width={length}
            height={band}
            viewBox={`0 0 ${String(length)} ${String(band)}`}
            overflow="hidden"
        >
            {[0, 1 / 3, 2 / 3].map((phase) => (
                <path
                    key={phase}
                    d={wavePath(0, length, band / 2, amplitude, period, phase)}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.12}
                />
            ))}
            <path
                d={`M0 ${String(band / 2)}L${String(length)} ${String(band / 2)}`}
                stroke={color}
                strokeWidth={0.08}
            />
        </svg>
    );
}

/** A rosette of turned ellipses, the guilloche flower in the corners of a banknote. */
export function Rosette({
    cx,
    cy,
    r,
    color,
}: {
    cx: number;
    cy: number;
    r: number;
    color: string;
}) {
    return (
        <g>
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <ellipse
                    key={i}
                    cx={cx}
                    cy={cy}
                    rx={r}
                    ry={r * 0.36}
                    transform={`rotate(${String(i * 30)} ${String(cx)} ${String(cy)})`}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.1}
                />
            ))}
            <circle cx={cx} cy={cy} r={r * 0.2} fill={color} stroke="none" />
        </g>
    );
}

/**
 * A rectangle with a scalloped edge, the bumps bulging out: the doily of Speels. `size` is the width of one bump;
 * each side gets a whole number of them.
 */
export function scallopedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    size: number,
): string {
    const across = Math.max(2, Math.round(w / size));
    const down = Math.max(2, Math.round(h / size));
    const sx = w / across;
    const sy = h / down;
    const arc = (r: number, toX: number, toY: number) =>
        `A${(r / 2).toFixed(3)} ${(r / 2).toFixed(3)} 0 0 1 ${toX.toFixed(3)} ${toY.toFixed(3)}`;
    let d = `M${x.toFixed(3)} ${y.toFixed(3)}`;
    for (let i = 1; i <= across; i++) d += arc(sx, x + i * sx, y);
    for (let i = 1; i <= down; i++) d += arc(sy, x + w, y + i * sy);
    for (let i = across - 1; i >= 0; i--) d += arc(sx, x + i * sx, y + h);
    for (let i = down - 1; i >= 0; i--) d += arc(sy, x, y + i * sy);

    return `${d}Z`;
}

/** A round badge with a scalloped edge around a centre, for the initial of a pawn in Speels. */
export function scallopedCircle(
    cx: number,
    cy: number,
    r: number,
    bumps: number,
): string {
    const point = (i: number) => {
        const angle = (2 * Math.PI * i) / bumps - Math.PI / 2;

        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
    };
    const chord = 2 * r * Math.sin(Math.PI / bumps);
    const start = point(0);
    let d = `M${start[0].toFixed(3)} ${start[1].toFixed(3)}`;
    for (let i = 1; i <= bumps; i++) {
        const [px, py] = point(i);
        d += `A${(chord / 2).toFixed(3)} ${(chord / 2).toFixed(3)} 0 0 1 ${px.toFixed(3)} ${py.toFixed(3)}`;
    }

    return `${d}Z`;
}

export interface ConfettiPiece {
    x: number;
    y: number;
    size: number;
    color: string;
    kind: 'dot' | 'ring' | 'dash' | 'star' | 'squiggle';
    turn: number;
}

/** One piece of confetti; `size` is about its width in mm. */
export function ConfettiShape({ piece }: { piece: ConfettiPiece }) {
    const { x, y, size: s, color, kind, turn } = piece;
    const rotate = `rotate(${turn.toFixed(0)} ${x.toFixed(2)} ${y.toFixed(2)})`;

    switch (kind) {
        case 'dot':
            return <circle cx={x} cy={y} r={s / 2} fill={color} />;
        case 'ring':
            return (
                <circle
                    cx={x}
                    cy={y}
                    r={s * 0.38}
                    fill="none"
                    stroke={color}
                    strokeWidth={s * 0.22}
                />
            );
        case 'dash':
            return (
                <path
                    d={`M${x - s * 0.6} ${y}L${x + s * 0.6} ${y}`}
                    transform={rotate}
                    stroke={color}
                    strokeWidth={s * 0.34}
                    strokeLinecap="round"
                />
            );
        case 'star': {
            const points: string[] = [];
            for (let i = 0; i < 10; i++) {
                const angle = (Math.PI * i) / 5 - Math.PI / 2;
                const r = i % 2 === 0 ? s * 0.6 : s * 0.26;
                points.push(
                    `${(x + r * Math.cos(angle)).toFixed(2)},${(y + r * Math.sin(angle)).toFixed(2)}`,
                );
            }

            return (
                <polygon
                    points={points.join(' ')}
                    transform={rotate}
                    fill={color}
                />
            );
        }
        case 'squiggle':
            return (
                <path
                    d={`M${x - s * 0.7} ${y}q${s * 0.233} ${-s * 0.45} ${s * 0.467} 0t${s * 0.467} 0t${s * 0.467} 0`}
                    transform={rotate}
                    fill="none"
                    stroke={color}
                    strokeWidth={s * 0.2}
                    strokeLinecap="round"
                />
            );
    }
}

const KINDS: readonly ConfettiPiece['kind'][] = [
    'dot',
    'ring',
    'squiggle',
    'dash',
    'star',
];

/**
 * Confetti spread over a box: a loose grid, each piece moved a little, so the pieces never clump. The same `seed`
 * gives the same confetti.
 */
export function scatter(
    seed: number,
    box: { x: number; y: number; w: number; h: number },
    count: number,
    size: number,
    colors: readonly string[],
): ConfettiPiece[] {
    const random = seeded(seed + 17);
    const columns = Math.max(1, Math.round(Math.sqrt((count * box.w) / box.h)));
    const rows = Math.max(1, Math.ceil(count / columns));
    const cellW = box.w / columns;
    const cellH = box.h / rows;
    const pieces: ConfettiPiece[] = [];

    for (let i = 0; i < count; i++) {
        const column = i % columns;
        const row = Math.floor(i / columns);
        const jitterX = (random() - 0.5) * cellW * 0.6;
        const jitterY = (random() - 0.5) * cellH * 0.6;
        pieces.push({
            x: box.x + (column + 0.5) * cellW + jitterX,
            y: box.y + (row + 0.5) * cellH + jitterY,
            size: size * (0.75 + random() * 0.5),
            color: colors[(i * 3 + seed) % colors.length] ?? '#000000',
            kind: KINDS[(i + Math.floor(random() * 2)) % KINDS.length] ?? 'dot',
            turn: random() * 180,
        });
    }

    return pieces;
}
