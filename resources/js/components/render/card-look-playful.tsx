import { ellipsePath } from '@/lib/render/banknote-guilloche';

import { wobblyRect } from './board-look-playful';
import { Svg } from './card-look';
import { Ornament, type OrnamentItem } from './card-look-ornament';

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
