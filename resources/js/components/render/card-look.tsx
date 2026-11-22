import type { ReactNode } from 'react';

import { mix } from '@/lib/render/color';
import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { wobblyRect } from './board-look';

/**
 * Drawing pieces shared by the styles of the cards and the title deeds (B269): the same family as the board styles
 * (B268), so a set can match. Vintage draws like an engraved banknote (a guilloche border between two rules, a
 * rosette, a cartouche), Modern needs no ornaments, and Speels gets a hand-drawn tile, a scalloped stamp and
 * confetti. Every piece takes its colours from the theme.
 */

/** The cream of Vintage paper, mixed into a colour of the theme so every theme keeps its own tint. */
const CREAM = '#F1E6C8';

/** A colour of the theme warmed towards cream, the paper of Vintage. */
export function creamed(base: string, amount = 0.55): string {
    return mix(base, CREAM, amount);
}

/** The ink of the engraving: the accent of a deck or the frame of a deed, deepened with the ink of the theme. */
export function engraving(theme: Theme, accent: string): string {
    return mix(accent, theme.ink, 0.45);
}

/** A small seeded random, so confetti lands in the same place on screen and in every print. */
function seededRandom(seed: number): () => number {
    let state = (seed * 2654435761) >>> 0 || 1;

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** An SVG in mm over a box, drawn on top of what came before it. */
export function Svg({
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
    slot?: string;
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

/** A diamond with its centre at (cx, cy), `d` from the centre to each point. */
export function diamondPath(cx: number, cy: number, d: number): string {
    return `M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`;
}

/**
 * A wave along a straight line from (x1, y1) to (x2, y2): half waves of about `half` mm, `amplitude` to either side,
 * starting up or down by `phase`. One path of curves, so a whole border stays a few kilobytes in a PDF (an SVG
 * pattern is drawn out tile by tile in print and made a deck of cards tens of megabytes).
 */
function wave(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    half: number,
    amplitude: number,
    phase: 0 | 1,
): string {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const count = Math.max(2, Math.round(length / half));
    const ux = (x2 - x1) / length;
    const uy = (y2 - y1) / length;
    const step = length / count;
    const at = (t: number, offset: number) =>
        `${(x1 + ux * t - uy * offset).toFixed(2)} ${(y1 + uy * t + ux * offset).toFixed(2)}`;
    let d = `M${at(0, 0)}`;
    for (let i = 0; i < count; i++) {
        const sign = (i + phase) % 2 === 0 ? 1 : -1;
        d += `Q${at(i * step + step / 2, 2 * amplitude * sign)} ${at((i + 1) * step, 0)}`;
    }

    return d;
}

/**
 * The border of Vintage, like the frame of an old banknote: a rule, a band with two crossing waves (a guilloche
 * rope), a hairline, and a square in each corner with a diamond in it. The band lies between `inset` and
 * `inset + band` from the edge.
 */
export function EngravedBorder({
    w,
    h,
    inset,
    band,
    color,
    paper,
    radius = 0,
}: {
    w: number;
    h: number;
    inset: number;
    band: number;
    color: string;
    /** The paper under the corner squares. */
    paper: string;
    radius?: number;
}) {
    const inner = inset + band;
    const mid = inset + band / 2;
    const half = band * 0.55;
    const amplitude = band * 0.3;
    const sides: [number, number, number, number][] = [
        [inner, mid, w - inner, mid],
        [w - mid, inner, w - mid, h - inner],
        [w - inner, h - mid, inner, h - mid],
        [mid, h - inner, mid, inner],
    ];
    const rope = (phase: 0 | 1) =>
        sides
            .map(([x1, y1, x2, y2]) =>
                wave(x1, y1, x2, y2, half, amplitude, phase),
            )
            .join('');
    const corners: [number, number][] = [
        [inset, inset],
        [w - inner, inset],
        [w - inner, h - inner],
        [inset, h - inner],
    ];

    return (
        <Svg x={0} y={0} w={w} h={h} slot="engraved-border">
            <path
                d={`${rope(0)}${rope(1)}`}
                fill="none"
                stroke={color}
                strokeWidth={0.1}
                data-slot="rope"
            />
            <rect
                x={inset}
                y={inset}
                width={w - 2 * inset}
                height={h - 2 * inset}
                rx={radius}
                fill="none"
                stroke={color}
                strokeWidth={0.35}
            />
            <rect
                x={inner}
                y={inner}
                width={w - 2 * inner}
                height={h - 2 * inner}
                fill="none"
                stroke={color}
                strokeWidth={0.18}
            />
            <rect
                x={inner + 0.5}
                y={inner + 0.5}
                width={w - 2 * inner - 1}
                height={h - 2 * inner - 1}
                fill="none"
                stroke={color}
                strokeWidth={0.08}
            />
            {corners.map(([cx, cy]) => (
                <g key={`${String(cx)}-${String(cy)}`}>
                    <rect
                        x={cx}
                        y={cy}
                        width={band}
                        height={band}
                        fill={paper}
                        stroke={color}
                        strokeWidth={0.18}
                    />
                    <path
                        d={diamondPath(
                            cx + band / 2,
                            cy + band / 2,
                            band * 0.32,
                        )}
                        fill={color}
                    />
                </g>
            ))}
        </Svg>
    );
}

/**
 * `count` circles of radius `radius` whose centres lie on a circle of the same radius around (cx, cy), so each runs
 * through the centre: the figure of a guilloche rosette, as one path.
 */
function ringOfCircles(
    cx: number,
    cy: number,
    radius: number,
    count: number,
): string {
    const r = radius.toFixed(2);
    let d = '';
    for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        d += `M${(x - radius).toFixed(2)} ${y.toFixed(2)}a${r} ${r} 0 1 0 ${(2 * radius).toFixed(2)} 0a${r} ${r} 0 1 0 ${(-2 * radius).toFixed(2)} 0`;
    }

    return d;
}

/**
 * The faint ground of a banknote behind a box: a large guilloche rosette from the middle, cut to the box. A few
 * dozen circles, so it stays light in print.
 */
export function GuillocheField({
    x,
    y,
    w,
    h,
    color,
    count = 48,
    opacity = 0.22,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    count?: number;
    opacity?: number;
}) {
    const r = Math.hypot(w, h) / 2;

    return (
        <Svg x={x} y={y} w={w} h={h} slot="mesh" clip>
            <path
                d={ringOfCircles(w / 2, h / 2, r / 2, count)}
                fill="none"
                stroke={color}
                strokeWidth={0.08}
                strokeOpacity={opacity}
            />
        </Svg>
    );
}

/**
 * A guilloche rosette: `count` circles through the centre, turned around it, the round ornament of a banknote.
 * Drawn around (`r`, `r`) in a box of 2r.
 */
export function Rosette({
    cx,
    cy,
    r,
    color,
    count = 24,
    strokeMm = 0.08,
    opacity = 1,
}: {
    cx: number;
    cy: number;
    r: number;
    color: string;
    count?: number;
    strokeMm?: number;
    opacity?: number;
}) {
    return (
        <Svg x={cx - r} y={cy - r} w={2 * r} h={2 * r} slot="rosette">
            <path
                d={ringOfCircles(r, r, r / 2, count)}
                fill="none"
                stroke={color}
                strokeWidth={strokeMm}
                strokeOpacity={opacity}
            />
        </Svg>
    );
}

/** An oval with a double line, the plate of a banknote's value. */
export function OvalPlate({
    x,
    y,
    w,
    h,
    color,
    fill,
    slot = 'oval',
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    fill: string;
    slot?: string;
}) {
    return (
        <Svg x={x} y={y} w={w} h={h} slot={slot}>
            <ellipse
                cx={w / 2}
                cy={h / 2}
                rx={w / 2 - 0.2}
                ry={h / 2 - 0.2}
                fill={fill}
                stroke={color}
                strokeWidth={0.35}
            />
            <ellipse
                cx={w / 2}
                cy={h / 2}
                rx={w / 2 - 0.9}
                ry={h / 2 - 0.9}
                fill="none"
                stroke={color}
                strokeWidth={0.12}
            />
        </Svg>
    );
}

/** A thin line with a diamond in the middle and a dot at each end, under a title in Vintage. */
export function Flourish({
    x,
    y,
    w,
    color,
}: {
    x: number;
    y: number;
    w: number;
    color: string;
}) {
    const mid = w / 2;

    return (
        <Svg x={x} y={y - 1} w={w} h={2} slot="flourish">
            <path
                d={`M0.6 1H${mid - 1.6}M${mid + 1.6} 1H${w - 0.6}`}
                stroke={color}
                strokeWidth={0.15}
            />
            <path d={diamondPath(mid, 1, 0.9)} fill={color} />
            <path
                d={diamondPath(mid - 1.9, 1, 0.35)}
                fill={color}
                opacity={0.8}
            />
            <path
                d={diamondPath(mid + 1.9, 1, 0.35)}
                fill={color}
                opacity={0.8}
            />
            <circle cx={0.4} cy={1} r={0.3} fill={color} />
            <circle cx={w - 0.4} cy={1} r={0.3} fill={color} />
        </Svg>
    );
}

/** The paper tile of Speels: rounded, with a hand-drawn ink edge. */
export function WobblyTile({
    x,
    y,
    w,
    h,
    radius,
    seed,
    fill,
    ink,
    strokeMm = 0.45,
    dashed = false,
    slot = 'tile',
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    radius: number;
    seed: number;
    fill: string;
    ink: string;
    strokeMm?: number;
    dashed?: boolean;
    slot?: string;
}) {
    return (
        <Svg x={0} y={0} w={x + w} h={y + h} slot={slot}>
            <path
                d={wobblyRect(x, y, w, h, radius, seed, 0.18)}
                fill={fill}
                stroke={ink}
                strokeWidth={strokeMm}
                strokeLinejoin="round"
                strokeDasharray={dashed ? '1.2 0.9' : undefined}
                strokeLinecap="round"
            />
        </Svg>
    );
}

/**
 * A shop awning: rounded top corners and a scalloped lower edge, the colour block of Speels. Returns the depth of a
 * scallop, so text can stay above it.
 */
export function scallopDepth(w: number): number {
    return w / Math.max(3, Math.round(w / 4.2)) / 2;
}

export function Awning({
    x,
    y,
    w,
    h,
    color,
    ink,
    slot = 'color-bar',
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    ink: string;
    slot?: string;
}) {
    const r = Math.min(2.4, h / 3);
    const count = Math.max(3, Math.round(w / 4.2));
    const bump = w / count;
    const bottom = h - bump / 2;
    let d = `M0 ${r}Q0 0 ${r} 0L${w - r} 0Q${w} 0 ${w} ${r}L${w} ${bottom}`;
    for (let i = count - 1; i >= 0; i--) {
        d += `A${bump / 2} ${bump / 2} 0 0 1 ${(i * bump).toFixed(3)} ${bottom.toFixed(3)}`;
    }

    return (
        <Svg x={x} y={y} w={w} h={h} slot={slot}>
            <path
                d={`${d}Z`}
                fill={color}
                stroke={ink}
                strokeWidth={0.4}
                strokeLinejoin="round"
            />
        </Svg>
    );
}

/** A round stamp with a scalloped edge, the badge of Speels. */
export function ScallopBadge({
    cx,
    cy,
    r,
    fill,
    ink,
    bumps = 18,
}: {
    cx: number;
    cy: number;
    r: number;
    fill: string;
    ink: string;
    bumps?: number;
}) {
    const points: string[] = [];
    const inner = r * 0.92;
    for (let i = 0; i < bumps; i++) {
        const a1 = (2 * Math.PI * i) / bumps;
        const a2 = (2 * Math.PI * (i + 1)) / bumps;
        const am = (a1 + a2) / 2;
        const p = (radius: number, angle: number) =>
            `${(r + radius * Math.cos(angle)).toFixed(3)} ${(r + radius * Math.sin(angle)).toFixed(3)}`;
        points.push(
            `${i === 0 ? 'M' : 'L'}${p(inner, a1)}Q${p(r * 1.07, am)} ${p(inner, a2)}`,
        );
    }

    return (
        <Svg x={cx - r} y={cy - r} w={2 * r} h={2 * r} slot="badge">
            <path
                d={`${points.join('')}Z`}
                fill={fill}
                stroke={ink}
                strokeWidth={0.45}
                strokeLinejoin="round"
            />
            <circle
                cx={r}
                cy={r}
                r={inner - 1.4}
                fill="none"
                stroke={ink}
                strokeWidth={0.2}
                strokeDasharray="0.9 0.7"
                strokeLinecap="round"
            />
        </Svg>
    );
}

/** A wavy line, the rule of Speels. */
export function Squiggle({
    x,
    y,
    w,
    color,
    amplitude = 0.45,
    wave = 2.4,
    strokeMm = 0.3,
    slot = 'squiggle',
}: {
    x: number;
    y: number;
    w: number;
    color: string;
    amplitude?: number;
    wave?: number;
    strokeMm?: number;
    slot?: string;
}) {
    const half = wave / 2;
    const count = Math.max(1, Math.round(w / half));
    const step = w / count;
    let d = `M0 ${amplitude}`;
    for (let i = 0; i < count; i++) {
        const peak = i % 2 === 0 ? -amplitude : 3 * amplitude;
        d += `Q${(i * step + step / 2).toFixed(3)} ${peak.toFixed(3)} ${((i + 1) * step).toFixed(3)} ${amplitude}`;
    }

    return (
        <Svg x={x} y={y - amplitude} w={w} h={2 * amplitude} slot={slot}>
            <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={strokeMm}
                strokeLinecap="round"
            />
        </Svg>
    );
}

/**
 * Confetti scattered over a box, outside the box `keep` where the content is: dots, rings and short strokes in the
 * colours given. `seed` keeps it the same for one element.
 */
export function ConfettiField({
    w,
    h,
    colors,
    seed,
    count,
    keep,
    size = 1,
}: {
    w: number;
    h: number;
    colors: readonly string[];
    seed: number;
    count: number;
    /** The box confetti stays out of, in mm. */
    keep?: { x: number; y: number; w: number; h: number };
    size?: number;
}) {
    const random = seededRandom(seed + 7);
    const pieces: ReactNode[] = [];
    let tries = 0;
    while (pieces.length < count && tries < count * 40) {
        tries += 1;
        const px = 0.8 + random() * (w - 1.6);
        const py = 0.8 + random() * (h - 1.6);
        if (
            keep !== undefined &&
            px > keep.x - 0.8 &&
            px < keep.x + keep.w + 0.8 &&
            py > keep.y - 0.8 &&
            py < keep.y + keep.h + 0.8
        ) {
            continue;
        }
        const index = pieces.length;
        const color = colors[index % colors.length] ?? '#000000';
        const kind = Math.floor(random() * 3);
        const s = size * (0.45 + random() * 0.35);
        const turn = Math.round(random() * 180);
        pieces.push(
            kind === 0 ? (
                <circle key={index} cx={px} cy={py} r={s} fill={color} />
            ) : kind === 1 ? (
                <circle
                    key={index}
                    cx={px}
                    cy={py}
                    r={s * 0.85}
                    fill="none"
                    stroke={color}
                    strokeWidth={s * 0.45}
                />
            ) : (
                <path
                    key={index}
                    d={`M${(px - s * 1.3).toFixed(2)} ${py.toFixed(2)}L${(px + s * 1.3).toFixed(2)} ${py.toFixed(2)}`}
                    transform={`rotate(${String(turn)} ${px.toFixed(2)} ${py.toFixed(2)})`}
                    stroke={color}
                    strokeWidth={s * 0.75}
                    strokeLinecap="round"
                />
            ),
        );
    }

    return (
        <Svg x={0} y={0} w={w} h={h} slot="confetti">
            {pieces}
        </Svg>
    );
}
