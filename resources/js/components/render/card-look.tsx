import { useContext, type ReactNode } from 'react';

import { ellipsePath } from '@/lib/render/banknote-guilloche';
import { mix } from '@/lib/render/color';
import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { RasterNotePattern } from './banknote-parts';
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
export const creamed = (base: string, amount = 0.55): string => {
    return mix(base, CREAM, amount);
};

/** The ink of the engraving: the accent of a deck or the frame of a deed, deepened with the ink of the theme. */
export const engraving = (theme: Theme, accent: string): string => {
    return mix(accent, theme.ink, 0.45);
};

/** A small seeded random, so confetti lands in the same place on screen and in every print. */
const seededRandom = (seed: number): (() => number) => {
    let state = (seed * 2654435761) >>> 0 || 1;

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/** An SVG in mm over a box, drawn on top of what came before it. */
export const Svg = ({
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
}) => {
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
};

/** A diamond with its centre at (cx, cy), `d` from the centre to each point. */
export const diamondPath = (cx: number, cy: number, d: number): string => {
    return `M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`;
};

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

/** One shape of an ornament, in mm: a stroke, a fill, or both. */
export type OrnamentItem = {
    d: string;
    stroke?: string;
    widthMm?: number;
    fill?: string;
    /** Opacity of the stroke, for the faint line work. */
    alpha?: number;
    /** A box the shape is cut to. */
    clip?: { x: number; y: number; w: number; h: number };
    /** Round ends on a stroke (confetti). */
    round?: boolean;
};

/**
 * Pixels per mm of an ornament picture: 12 is 305 dpi, the resolution of a print shop, and sharp for the 0.08 mm
 * lines at print size. Finer would only make the PDF heavier.
 */
const ORNAMENT_PX_PER_MM = 12;

const ornamentPictures = new Map<string, string | null>();

/** A short fingerprint of an ornament, so equal ornaments on different cards share one picture. */
const fingerprint = (parts: readonly string[]): string => {
    let a = 5381;
    let b = 52711;
    for (const part of parts) {
        for (let i = 0; i < part.length; i++) {
            const c = part.charCodeAt(i);
            a = (Math.imul(a, 33) ^ c) >>> 0;
            b = (Math.imul(b, 31) + c) >>> 0;
        }
    }

    return `${a.toString(36)}${b.toString(36)}`;
};

/**
 * The fine line work of Vintage as one PNG, drawn once per kind (the back of every Chance card is the same
 * picture), like the guilloche of the notes (B270). Chrome writes vector line work into the PDF once per card, which
 * made a set of Vintage cards 19 MB; a picture it has written before it reuses. Returns null where there is no
 * canvas (tests, the server).
 */
const ornamentPicture = (
    key: string,
    w: number,
    h: number,
    background: string | undefined,
    items: readonly OrnamentItem[],
): string | null => {
    const hit = ornamentPictures.get(key);
    if (hit !== undefined) {
        return hit;
    }

    let url: string | null = null;
    if (typeof document !== 'undefined' && typeof Path2D !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * ORNAMENT_PX_PER_MM));
        canvas.height = Math.max(1, Math.round(h * ORNAMENT_PX_PER_MM));
        let context: CanvasRenderingContext2D | null = null;
        try {
            context = canvas.getContext('2d');
        } catch {
            context = null;
        }
        if (context !== null) {
            context.scale(canvas.width / w, canvas.height / h);
            context.lineJoin = 'round';
            if (background !== undefined) {
                context.fillStyle = background;
                context.fillRect(0, 0, w, h);
            }
            for (const item of items) {
                const path = new Path2D(item.d);
                context.save();
                if (item.clip !== undefined) {
                    context.beginPath();
                    context.rect(
                        item.clip.x,
                        item.clip.y,
                        item.clip.w,
                        item.clip.h,
                    );
                    context.clip();
                }
                if (item.fill !== undefined) {
                    context.fillStyle = item.fill;
                    context.fill(path);
                }
                if (item.stroke !== undefined) {
                    context.globalAlpha = item.alpha ?? 1;
                    context.lineCap = item.round === true ? 'round' : 'butt';
                    context.strokeStyle = item.stroke;
                    context.lineWidth = item.widthMm ?? 0.1;
                    context.stroke(path);
                }
                context.restore();
            }
            try {
                const data = canvas.toDataURL('image/png');
                url = data.startsWith('data:image/png') ? data : null;
            } catch {
                url = null;
            }
        }
    }
    ornamentPictures.set(key, url);

    return url;
};

/**
 * Ornament shapes in a box of `w` x `h` mm at (`x`, `y`); the shapes are in mm of the box. On a print sheet they
 * are one picture per kind (B269); on screen and in tests they stay vector, sharp at any zoom. With a `background`
 * the picture is opaque paper, which keeps it light: it then has to be the first thing drawn in its box.
 */
export const Ornament = ({
    x,
    y,
    w,
    h,
    items,
    background,
    slot,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    items: readonly OrnamentItem[];
    background?: string;
    slot: string;
}) => {
    const raster = useContext(RasterNotePattern);
    const picture = raster
        ? ornamentPicture(
              fingerprint([
                  String(w),
                  String(h),
                  background ?? '',
                  ...items.flatMap((item) => [
                      item.d,
                      item.stroke ?? '',
                      item.fill ?? '',
                      String(item.widthMm ?? ''),
                      String(item.alpha ?? ''),
                      item.round === true ? 'r' : '',
                      item.clip === undefined
                          ? ''
                          : `${String(item.clip.x)},${String(item.clip.y)},${String(item.clip.w)},${String(item.clip.h)}`,
                  ]),
              ]),
              w,
              h,
              background,
              items,
          )
        : null;

    if (picture !== null) {
        return (
            <img
                src={picture}
                alt=""
                aria-hidden="true"
                data-slot={slot}
                data-raster=""
                style={{
                    position: 'absolute',
                    left: mm(x),
                    top: mm(y),
                    width: mm(w),
                    height: mm(h),
                    maxWidth: 'none',
                }}
            />
        );
    }

    return (
        <Svg x={x} y={y} w={w} h={h} slot={slot}>
            {items.map((item, index) => {
                const clipId =
                    item.clip === undefined
                        ? undefined
                        : `${slot}-clip-${String(index)}`;

                return (
                    <g key={index}>
                        {item.clip !== undefined && (
                            <clipPath id={clipId}>
                                <rect
                                    x={item.clip.x}
                                    y={item.clip.y}
                                    width={item.clip.w}
                                    height={item.clip.h}
                                />
                            </clipPath>
                        )}
                        <path
                            d={item.d}
                            fill={item.fill ?? 'none'}
                            stroke={item.stroke}
                            strokeWidth={item.widthMm}
                            strokeOpacity={item.alpha}
                            strokeLinecap={
                                item.round === true ? 'round' : undefined
                            }
                            strokeLinejoin="round"
                            clipPath={
                                clipId === undefined
                                    ? undefined
                                    : `url(#${clipId})`
                            }
                        />
                    </g>
                );
            })}
        </Svg>
    );
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

/** The paper tile of Speels: rounded, with a hand-drawn ink edge. */
export const WobblyTile = ({
    x,
    y,
    w,
    h,
    radius,
    seed,
    fill,
    ink,
    strokeMm = 0.45,
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
    slot?: string;
}) => {
    // The box leaves room for the wobble and the line, so neither is cut off in the picture of a print sheet.
    const margin = 0.6;

    return (
        <Ornament
            x={x - margin}
            y={y - margin}
            w={w + 2 * margin}
            h={h + 2 * margin}
            slot={slot}
            items={[
                {
                    d: wobblyRect(margin, margin, w, h, radius, seed, 0.18),
                    ...(fill === 'none' ? {} : { fill }),
                    stroke: ink,
                    widthMm: strokeMm,
                    round: true,
                },
            ]}
        />
    );
};

/**
 * A shop awning: rounded top corners and a scalloped lower edge, the colour block of Speels. Returns the depth of a
 * scallop, so text can stay above it.
 */
export const scallopDepth = (w: number): number => {
    return w / Math.max(3, Math.round(w / 4.2)) / 2;
};

export const Awning = ({
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
}) => {
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
};

/** A round stamp with a scalloped edge, the badge of Speels. */
export const ScallopBadge = ({
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
}) => {
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
                strokeOpacity={0.6}
                strokeLinecap="round"
            />
        </Svg>
    );
};

/** A wavy line, the rule of Speels. */
export const Squiggle = ({
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
}) => {
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
};

/**
 * Confetti scattered over a box, outside the box `keep` where the content is: dots, rings and short strokes in the
 * colours given. `seed` keeps it the same for one element.
 */
export const ConfettiField = ({
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
}) => {
    const random = seededRandom(seed + 7);
    const pieces: OrnamentItem[] = [];
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
        const color = colors[pieces.length % colors.length] ?? '#000000';
        const kind = Math.floor(random() * 3);
        const s = size * (0.45 + random() * 0.35);
        const turn = (Math.round(random() * 180) * Math.PI) / 180;
        if (kind === 0) {
            pieces.push({ d: ellipsePath(px, py, s, s), fill: color });
        } else if (kind === 1) {
            pieces.push({
                d: ellipsePath(px, py, s * 0.85, s * 0.85),
                stroke: color,
                widthMm: s * 0.45,
            });
        } else {
            const dx = Math.cos(turn) * s * 1.3;
            const dy = Math.sin(turn) * s * 1.3;
            pieces.push({
                d: `M${(px - dx).toFixed(2)} ${(py - dy).toFixed(2)}L${(px + dx).toFixed(2)} ${(py + dy).toFixed(2)}`,
                stroke: color,
                widthMm: s * 0.75,
                round: true,
            });
        }
    }

    return <Ornament x={0} y={0} w={w} h={h} slot="confetti" items={pieces} />;
};
