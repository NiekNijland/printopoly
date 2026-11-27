import { useContext } from 'react';

import { bumpyCircle } from '@/lib/render/banknote-guilloche';
import {
    cached,
    noteIcons,
    rasterPattern,
} from '@/lib/render/banknote-pattern';

import {
    NoteIcon,
    NoteRaster,
    NoteSvg,
    RASTER_PX_PER_MM,
    RasterNotePattern,
    tint,
} from './banknote-parts';
import { FRAME_INSET, NOTE_H, NOTE_W } from './banknote-styles-shared';

export const PLAYFUL = {
    frame: {
        x: FRAME_INSET,
        y: FRAME_INSET,
        w: NOTE_W - 2 * FRAME_INSET,
        h: NOTE_H - 2 * FRAME_INSET,
    },
    radius: 4.5,
    badge: { cx: 50, cy: 30, r: 15.2 },
    pill: { x: 73.5, y: 16.5, w: 33.5, h: 26, r: 6 },
    /** Value bubbles top left and bottom right, icons in the other two corners. */
    bubbles: [
        { cx: 13, cy: 13, kind: 'value' },
        { cx: 117, cy: 13, kind: 'icon' },
        { cx: 13, cy: 47, kind: 'icon' },
        { cx: 117, cy: 47, kind: 'value' },
    ],
    bubbleR: 5.8,
} as const;

/** The polka dots of Speels: round caps on a dash of length 0. */
const POLKA = { width: 0.75, dash: [0, 2.8] } as const;

/** Confetti in the free spots: x, y, shape, colour index (accent, second accent, ink) and a turn in degrees. */
const CONFETTI: readonly [
    number,
    number,
    'dot' | 'tri' | 'wave' | 'plus',
    number,
    number,
][] = [
    [24, 21, 'dot', 0, 0],
    [29.5, 27, 'wave', 1, -20],
    [23, 34, 'tri', 2, 15],
    [28, 41.5, 'plus', 0, 10],
    [22.5, 8.6, 'wave', 2, 0],
    [36, 8.4, 'dot', 1, 0],
    [66.5, 9.5, 'tri', 0, -12],
    [71, 49.5, 'dot', 2, 0],
    [33, 51, 'wave', 0, 15],
    [61, 51.5, 'plus', 1, 0],
    [112.5, 26, 'dot', 1, 0],
    [114, 33.5, 'tri', 0, 30],
    [97, 49.5, 'wave', 1, -10],
    [93, 9, 'plus', 2, 20],
];

const confettiShape = (shape: 'dot' | 'tri' | 'wave' | 'plus'): string => {
    switch (shape) {
        case 'dot':
            return 'M0.9 0A0.9 0.9 0 1 1 -0.9 0A0.9 0.9 0 1 1 0.9 0Z';
        case 'tri':
            return 'M0 -1.2L1.1 0.8H-1.1Z';
        case 'wave':
            return 'M-2 0Q-1 -1.1 0 0T2 0';
        case 'plus':
            return 'M-1.1 0H1.1M0 -1.1V1.1';
    }
};

const playfulBadge = () => {
    const { badge } = PLAYFUL;

    return cached('playful:badge', () =>
        bumpyCircle(badge.cx, badge.cy, badge.r, 18, 0.75),
    );
};

const PlayfulConfetti = ({ colors }: { colors: string[] }) => (
    <g data-slot="confetti">
        {CONFETTI.map(([x, y, shape, color, turn]) => (
            <path
                key={`${x}-${y}`}
                d={confettiShape(shape)}
                transform={`translate(${x} ${y}) rotate(${turn})`}
                fill={
                    shape === 'dot' || shape === 'tri' ? colors[color] : 'none'
                }
                stroke={
                    shape === 'wave' || shape === 'plus'
                        ? colors[color]
                        : 'none'
                }
                strokeWidth={0.55}
                strokeLinecap="round"
            />
        ))}
    </g>
);

const PlayfulBadge = ({ ink, light }: { ink: string; light: string }) => {
    const { badge } = PLAYFUL;
    const badgeD = playfulBadge();

    // The badge with a sticker shadow in ink, a little turned.
    return (
        <g transform={`rotate(-6 ${badge.cx} ${badge.cy})`} data-slot="badge">
            <path d={badgeD} fill={ink} transform="translate(0.9 1.1)" />
            <path
                d={badgeD}
                fill={light}
                stroke={ink}
                strokeWidth={0.5}
                data-oval=""
            />
        </g>
    );
};

const PlayfulBubbles = ({
    value,
    ink,
    light,
}: {
    value: number;
    ink: string;
    light: string;
}) => {
    const { bubbles, bubbleR } = PLAYFUL;
    const [first, second] = noteIcons(value);
    const iconBox = (bubble: { cx: number; cy: number }) => ({
        x: bubble.cx - 4.6,
        y: bubble.cy - 4.6,
        w: 9.2,
        h: 9.2,
    });

    return (
        <>
            {bubbles.map((bubble) => (
                <circle
                    key={`${bubble.cx}-${bubble.cy}`}
                    cx={bubble.cx}
                    cy={bubble.cy}
                    r={bubbleR}
                    fill={bubble.kind === 'value' ? ink : light}
                    stroke={ink}
                    strokeWidth={0.45}
                    data-corner=""
                />
            ))}
            <NoteIcon
                key={first}
                name={first}
                box={iconBox(bubbles[1])}
                ink={ink}
                light={light}
            />
            <NoteIcon
                key={second}
                name={second}
                box={iconBox(bubbles[2])}
                ink={ink}
                light={light}
            />
        </>
    );
};

const playfulPolka = () => {
    const { frame } = PLAYFUL;

    // The dots stay 1.6 mm inside the frame, clear of its round corners, so they need no clip.
    return cached('playful:dots', () => {
        const rows: string[] = [];
        const right = frame.x + frame.w - 1.6;
        for (
            let row = 0, y = frame.y + 1.8;
            y < frame.y + frame.h - 1.6;
            row++, y += 2.6
        ) {
            rows.push(
                `M${frame.x + (row % 2 === 0 ? 1.8 : 3.2)} ${y}H${right}`,
            );
        }

        return rows.join('');
    });
};

export const PlayfulArt = ({
    value,
    paper,
    ink,
    light,
    accents,
    full,
}: {
    value: number;
    paper: string;
    ink: string;
    light: string;
    accents: string[];
    full: boolean;
}) => {
    const { frame, radius } = PLAYFUL;
    const dots = tint(ink, paper, 0.86);
    const polka = playfulPolka();
    // On a print sheet the dots are one picture per value: a dash pattern in a PDF becomes one shape per dot.
    const raster =
        useContext(RasterNotePattern) && !full
            ? rasterPattern(['playful', dots, paper].join('|'), {
                  w: NOTE_W,
                  h: NOTE_H,
                  clip: frame,
                  clipped: [],
                  free: [
                      {
                          d: polka,
                          color: dots,
                          widthMm: POLKA.width,
                          dash: POLKA.dash,
                      },
                  ],
                  lineMm: POLKA.width,
                  background: paper,
                  density: RASTER_PX_PER_MM,
              })
            : null;

    return (
        <>
            {raster !== null && <NoteRaster src={raster} slot="dots" />}
            <NoteSvg slot="playful">
                {!full && raster === null && (
                    // Polka dots: dotted lines with round caps, one path for the whole field.
                    <path
                        d={polka}
                        fill="none"
                        stroke={dots}
                        strokeWidth={POLKA.width}
                        strokeLinecap="round"
                        strokeDasharray={POLKA.dash.join(' ')}
                        data-slot="dots"
                    />
                )}
                <rect
                    x={frame.x}
                    y={frame.y}
                    width={frame.w}
                    height={frame.h}
                    rx={radius}
                    fill="none"
                    stroke={ink}
                    strokeWidth={0.55}
                    data-frame=""
                />
                <PlayfulConfetti colors={accents} />
                <PlayfulBadge ink={ink} light={light} />
                <PlayfulBubbles value={value} ink={ink} light={light} />
            </NoteSvg>
        </>
    );
};
