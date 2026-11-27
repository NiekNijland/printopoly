import { ellipsePath } from '@/lib/render/banknote-guilloche';

import { diamondPath } from './card-look';
import { Ornament, type OrnamentItem } from './card-look-ornament';
import { Svg } from './sheet';

/**
 * A wave along a straight line from (x1, y1) to (x2, y2): half waves of about `half` mm, `amplitude` to either side,
 * starting up or down by `phase`. One path of curves, so a whole border stays a few kilobytes in a PDF (an SVG
 * pattern is drawn out tile by tile in print and made a deck of cards tens of megabytes).
 */
const wave = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    half: number,
    amplitude: number,
    phase: 0 | 1,
): string => {
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
};

const rectPath = (x: number, y: number, w: number, h: number): string => {
    return `M${x.toFixed(2)} ${y.toFixed(2)}h${w.toFixed(2)}v${h.toFixed(2)}h${(-w).toFixed(2)}Z`;
};

/**
 * The border of Vintage, like the frame of an old banknote: a rule, a band with two crossing waves (a guilloche
 * rope), a hairline, and a square in each corner with a diamond in it. The band lies between `inset` and
 * `inset + band` from the edge of a `w` x `h` box.
 */
export const borderItems = ({
    w,
    h,
    inset,
    band,
    color,
    paper,
}: {
    w: number;
    h: number;
    inset: number;
    band: number;
    color: string;
    /** The paper under the corner squares. */
    paper: string;
}): OrnamentItem[] => {
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
    const corners = [
        [inset, inset],
        [w - inner, inset],
        [w - inner, h - inner],
        [inset, h - inner],
    ] as const;

    return [
        { d: `${rope(0)}${rope(1)}`, stroke: color, widthMm: 0.1 },
        {
            d: rectPath(inset, inset, w - 2 * inset, h - 2 * inset),
            stroke: color,
            widthMm: 0.35,
        },
        {
            d: rectPath(inner, inner, w - 2 * inner, h - 2 * inner),
            stroke: color,
            widthMm: 0.18,
        },
        {
            d: rectPath(
                inner + 0.5,
                inner + 0.5,
                w - 2 * inner - 1,
                h - 2 * inner - 1,
            ),
            stroke: color,
            widthMm: 0.08,
        },
        {
            d: corners.map(([cx, cy]) => rectPath(cx, cy, band, band)).join(''),
            fill: paper,
            stroke: color,
            widthMm: 0.18,
        },
        {
            d: corners
                .map(([cx, cy]) =>
                    diamondPath(cx + band / 2, cy + band / 2, band * 0.32),
                )
                .join(''),
            fill: color,
        },
    ];
};

/** The border of Vintage over a whole element; see `borderItems`. */
export const EngravedBorder = ({
    w,
    h,
    inset,
    band,
    color,
    paper,
    opaque = false,
}: {
    w: number;
    h: number;
    inset: number;
    band: number;
    color: string;
    paper: string;
    /** Paints the paper under the border too: lighter in print, but then it must be drawn first. */
    opaque?: boolean;
}) => {
    return (
        <Ornament
            x={0}
            y={0}
            w={w}
            h={h}
            slot="engraved-border"
            {...(opaque ? { background: paper } : {})}
            items={borderItems({ w, h, inset, band, color, paper })}
        />
    );
};

/**
 * `count` circles of radius `radius` whose centres lie on a circle of the same radius around (cx, cy), so each runs
 * through the centre: the figure of a guilloche rosette, as one path.
 */
const ringOfCircles = (
    cx: number,
    cy: number,
    radius: number,
    count: number,
): string => {
    let d = '';
    for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        d += ellipsePath(
            cx + radius * Math.cos(angle),
            cy + radius * Math.sin(angle),
            radius,
            radius,
        );
    }

    return d;
};

/** A guilloche rosette of `count` circles through its centre, radius `r` around (cx, cy). */
export const rosetteItem = ({
    cx,
    cy,
    r,
    color,
    count = 24,
    strokeMm = 0.08,
    alpha = 1,
}: {
    cx: number;
    cy: number;
    r: number;
    color: string;
    count?: number;
    strokeMm?: number;
    alpha?: number;
}): OrnamentItem => {
    return {
        d: ringOfCircles(cx, cy, r / 2, count),
        stroke: color,
        widthMm: strokeMm,
        alpha,
    };
};

/** The faint ground of a banknote over a box: a large rosette from its middle, cut to the box. */
export const fieldItem = ({
    x,
    y,
    w,
    h,
    color,
    count = 20,
    alpha = 0.22,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    count?: number;
    alpha?: number;
}): OrnamentItem => {
    const r = Math.hypot(w, h) / 2;

    return {
        d: ringOfCircles(x + w / 2, y + h / 2, r / 2, count),
        stroke: color,
        widthMm: 0.08,
        alpha,
        clip: { x, y, w, h },
    };
};

/** An oval with a double line, the plate of a banknote's value, in a box at (x, y). */
export const ovalItems = ({
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
}): OrnamentItem[] => {
    const cx = x + w / 2;
    const cy = y + h / 2;

    return [
        {
            d: ellipsePath(cx, cy, w / 2 - 0.2, h / 2 - 0.2),
            fill,
            stroke: color,
            widthMm: 0.35,
        },
        {
            d: ellipsePath(cx, cy, w / 2 - 0.9, h / 2 - 0.9),
            stroke: color,
            widthMm: 0.12,
        },
    ];
};

/** A round plate with a thin edge, behind a symbol. */
export const discItem = ({
    cx,
    cy,
    r,
    color,
    fill,
}: {
    cx: number;
    cy: number;
    r: number;
    color: string;
    fill: string;
}): OrnamentItem => {
    return {
        d: ellipsePath(cx, cy, r, r),
        fill,
        stroke: color,
        widthMm: 0.25,
    };
};

/** A thin line with a diamond in the middle and a dot at each end, under a title in Vintage. */
export const Flourish = ({
    x,
    y,
    w,
    color,
}: {
    x: number;
    y: number;
    w: number;
    color: string;
}) => {
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
};
