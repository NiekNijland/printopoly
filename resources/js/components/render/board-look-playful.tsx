import type { ReactNode } from 'react';

import { Svg, TILE_GAP, TILE_RADIUS } from './board-look';

/** A small seeded random, so a hand-drawn edge is the same on screen and in every print. */
export const seeded = (seed: number): (() => number) => {
    let state = (seed * 2654435761) >>> 0 || 1;

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/**
 * The outline of a rounded rectangle drawn by hand: points along the edge, each moved a little in or out, joined by
 * smooth curves. `seed` keeps it the same for one space.
 */
export const wobblyRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    seed: number,
    amp = 0.22,
): string => {
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
};

/** The tile of Speels: a rounded paper tile with a hand-drawn ink edge, set off the board colour around it. */
export const PlayfulTile = ({
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
}) => {
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
};

/** The colour band of a street in Speels: a shop awning with rounded top corners and a scalloped edge. */
export const AwningBand = ({
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
}) => {
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
};

/** A rounded pill, the price sticker of Speels; dashed for the amount of a tax space. */
export const Pill = ({
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
}) => {
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
};

/**
 * Confetti in the free tips of a corner space, the small fun of Speels: dots, rings and short strokes in the colours
 * of the theme. The text runs across the diagonal in the middle, so the inner point (top left) and the outer corner
 * (bottom right) stay free.
 */
export const Confetti = ({
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
}) => {
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
};
