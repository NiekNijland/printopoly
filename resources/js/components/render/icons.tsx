import { is, keyOf } from '@/lib/parse';
import { mm } from '@/lib/render/units';

export type IconName = keyof typeof PATHS;

/**
 * Original line drawings on a 20 x 20 grid (B87). Circles are written as arcs so every
 * icon stays a list of plain paths.
 */
const PATHS = {
    // Station: a small steam engine seen from the side, on a rail.
    train: [
        'M2.5 12.5V9h8.5V5h6v7.5z',
        'M4.5 9V6.2h2.5V9',
        'M13 7.5h2',
        'M4.1 15.6a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0',
        'M11.6 15.6a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0',
    ],
    // Electricity: a bulb with a few rays.
    bulb: [
        'M10 4a4.5 4.5 0 0 0-2.8 8v1.5h5.6V12A4.5 4.5 0 0 0 10 4z',
        'M8 15.5h4',
        'M8.8 17.5h2.4',
        'M10 .8v1.4',
        'M3.4 3.6l1 1',
        'M16.6 3.6l-1 1',
        'M1.2 9h1.6',
        'M17.2 9h1.6',
    ],
    // Water: a tap with a drop.
    tap: [
        'M2 6h8a4 4 0 0 1 4 4v1.5',
        'M6 6V3.2',
        'M3.8 3.2h4.4',
        'M12.5 11.5h3',
        'M14 14.2c1.3 1.7 1.9 2.7 1.9 3.5a1.9 1.9 0 0 1-3.8 0c0-.8.6-1.8 1.9-3.5z',
    ],
    // Community Chest: a treasure chest with a round lid and a lock.
    chest: [
        'M3 10a7 6 0 0 1 14 0',
        'M3 10h14v7.5H3z',
        'M7 10v7.5',
        'M13 10v7.5',
        'M10 12v2.4',
    ],
    // Chance: a die showing three.
    dice: [
        'M6 3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z',
        'M6.8 6.8h.01',
        'M10 10h.01',
        'M13.2 13.2h.01',
    ],
    // A pawn of the game, the piece every player moves: on the box lid and the cover of the rules booklet, where a
    // die stood before the dice left the set (B200, B245).
    pawn: [
        'M7.4 4.6a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0',
        'M8.6 7.1L8.3 9',
        'M11.4 7.1L11.7 9',
        'M6.8 9h6.4',
        'M8.3 9C8.2 11.8 7.4 13.9 5.8 15.5h8.4C12.6 13.9 11.8 11.8 11.7 9',
        'M4.5 15.5h11v2.5h-11z',
    ],
    // Free Parking: a small car on its wheels.
    car: [
        'M2 12l1.6-4.4A2 2 0 0 1 5.5 6.3h9a2 2 0 0 1 1.9 1.3L18 12',
        'M2 12h16v3H2z',
        'M5.2 9h9.6',
        'M4.6 15.8a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0',
        'M12.2 15.8a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0',
    ],
    bars: ['M4 3h12v14H4z', 'M8 3v14', 'M12 3v14'],
    'arrow-left': ['M17 10H4', 'M9 5l-5 5 5 5'],
    pointer: ['M4 10h12', 'M11 5l5 5-5 5'],

    // The icons you can choose for a special space (B136). Same grid, same line, no figures from the original game.
    'hand-key': [
        'M4.5 5a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0',
        'M8.9 5h7',
        'M14 5v2',
        'M16.2 5v1.6',
        'M2.5 17.5V13a1.5 1.5 0 0 1 1.5-1.5h6.5l3.2-2.1a1.3 1.3 0 0 1 1.6 2l-3.8 3.6H7.5',
        'M2.5 17.5h6',
    ],
    'window-bars': [
        'M4 17.5V9a6 6 0 0 1 12 0v8.5z',
        'M8 3.4v14.1',
        'M12 3.4v14.1',
        'M2.5 17.5h15',
    ],
    siren: [
        'M5 15V11a5 5 0 0 1 10 0v4',
        'M3.5 15h13v2.5h-13z',
        'M10 1.8v1.8',
        'M3.4 4.4l1.3 1.3',
        'M16.6 4.4l-1.3 1.3',
        'M8 11a2 2 0 0 1 2-2',
    ],
    handcuffs: [
        'M1.8 13.2a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
        'M11.2 13.2a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
        'M5.3 9.7V7.5A1.5 1.5 0 0 1 6.8 6h6.4a1.5 1.5 0 0 1 1.5 1.5v2.2',
        'M10 6V3.5',
    ],
    whistle: [
        'M3.5 12.5a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0',
        'M8 8h9.5v3.5h-5.3',
        'M8 12.5h.01',
        'M4.6 9.3L2.8 6',
    ],
    'arrow-bars': [
        'M1.8 10h8.4',
        'M7.2 7l3 3-3 3',
        'M12.5 3.5h5.5v13h-5.5z',
        'M15.25 3.5v13',
    ],
    key: [
        'M2.5 10a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0',
        'M8.9 10h8.6',
        'M14.5 10v3',
        'M17.5 10v2.4',
    ],
    padlock: ['M4.5 9h11v8.5h-11z', 'M7 9V6.5a3 3 0 0 1 6 0V9', 'M10 12.2v2.3'],
    bench: [
        'M3.5 5.5h13',
        'M3.5 8.5h13',
        'M2.5 11.5h15',
        'M5 5.5v6',
        'M15 5.5v6',
        'M4.5 11.5v5',
        'M15.5 11.5v5',
    ],
    coffee: [
        'M4 8h10v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z',
        'M14 9.5h1.5a2 2 0 0 1 0 4H14',
        'M7 2.5c-.8 1 .8 2 0 3.2',
        'M11 2.5c-.8 1 .8 2 0 3.2',
    ],
    'p-sign': [
        'M5 2.5h10A2.5 2.5 0 0 1 17.5 5v10a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 15V5A2.5 2.5 0 0 1 5 2.5z',
        'M8 14.5v-9h3a2.5 2.5 0 0 1 0 5H8',
    ],
    flag: ['M4.5 18.5V2.5', 'M4.5 3.5h11l-2.5 3.5 2.5 3.5h-11'],
    sun: [
        'M6.5 10a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
        'M10 1.5v2',
        'M10 16.5v2',
        'M1.5 10h2',
        'M16.5 10h2',
        'M4 4l1.4 1.4',
        'M14.6 14.6L16 16',
        'M4 16l1.4-1.4',
        'M14.6 5.4L16 4',
    ],
    rocket: [
        'M10 2c2.8 2.2 4 5 4 8.5V14H6v-3.5C6 7 7.2 4.2 10 2z',
        'M8.8 8a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0',
        'M6 11l-2.5 2.5V16L6 14.5',
        'M14 11l2.5 2.5V16L14 14.5',
        'M8.5 16.5L10 18.5l1.5-2',
    ],
    star: [
        'M10 2.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2L2.5 8l5.2-.7z',
    ],
    flame: [
        'M10 2c.5 3 4.5 4.8 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2.4 1.2-3.8 2.2-4.8.2 1.6.9 2.5 1.8 2.8C9 7 9 4.5 10 2z',
        'M10 13.5c1 .8 1.5 1.5 1.5 2.3a1.5 1.5 0 0 1-3 0c0-.8.5-1.5 1.5-2.3z',
    ],
    'wind-turbine': [
        'M9.3 18.8L10 8.2l.7 10.6',
        'M9.1 6.6a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0',
        'M10 5.7V1.2',
        'M10.8 7.1l3.9 2.3',
        'M9.2 7.1l-3.9 2.3',
        'M5.5 18.8h9',
    ],
    wifi: [
        'M2 7.5a11.5 11.5 0 0 1 16 0',
        'M4.8 10.6a7.5 7.5 0 0 1 10.4 0',
        'M7.6 13.6a3.4 3.4 0 0 1 4.8 0',
        'M10 16.5h.01',
    ],
    'solar-panel': [
        'M4.5 3.5h11l2 9h-15z',
        'M3.5 8h13',
        'M8.2 3.5l-.6 9',
        'M11.8 3.5l.6 9',
        'M10 12.5v4',
        'M6.5 17.5h7',
    ],
    tram: [
        'M5 5h10a2 2 0 0 1 2 2v7H3V7a2 2 0 0 1 2-2z',
        'M3 9.5h14',
        'M8 5l2-2.5 2 2.5',
        'M6 14v2',
        'M14 14v2',
        'M2 17.5h16',
    ],
    bus: [
        'M3.5 3.5h13a1 1 0 0 1 1 1V15h-15V4.5a1 1 0 0 1 1-1z',
        'M2.5 9h15',
        'M10 3.5V9',
        'M4.5 15a1.5 1.5 0 1 0 3 0',
        'M12.5 15a1.5 1.5 0 1 0 3 0',
        'M5 12h.01',
        'M15 12h.01',
    ],
    bike: [
        'M1.5 13.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
        'M11.5 13.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
        'M5 13.5l3-6 2 6z',
        'M8 7.5h5.5L15 13.5',
        'M10 13.5l3.5-6',
        'M6.8 6h2.6',
        'M13.5 7.5L13 5h2',
    ],
    ferry: [
        'M2 12h16l-2.5 4.5h-11z',
        'M5 12V8.5h9V12',
        'M11 8.5V5.5h2v3',
        'M7.5 10h.01',
        'M2 18.8c1.5-1 2.5-1 4 0s2.5 1 4 0 2.5-1 4 0 2.5 1 4 0',
    ],
    coins: [
        'M2.5 6c0-1.1 2.5-2 5.5-2s5.5.9 5.5 2-2.5 2-5.5 2-5.5-.9-5.5-2z',
        'M2.5 6v6.5c0 1.1 2.5 2 5.5 2',
        'M2.5 9.3c0 1.1 2.5 2 5.5 2',
        'M13.5 6v2',
        'M9.5 14a4.25 4.25 0 1 0 8.5 0a4.25 4.25 0 1 0-8.5 0',
        'M13.75 12.3v3.4',
    ],
    'piggy-bank': [
        'M3.5 10.5a6 5 0 0 1 11.2-2.5h1.8v3.5l-1.5.6a6 5 0 0 1-2 2.6V17h-2.5v-1.6a6.5 6.5 0 0 1-2.5 0V17H5.5v-2.5a5 5 0 0 1-2-4z',
        'M8 5.5h3',
        'M3.5 10c-1 0-1.5-.8-1.2-1.6',
        'M13.5 9.5h.01',
    ],
    receipt: [
        'M5 2.5h10v15l-1.7-1.2-1.6 1.2-1.7-1.2-1.6 1.2-1.7-1.2L5 17.5z',
        'M7.5 6.5h5',
        'M7.5 9.5h5',
        'M7.5 12.5h3',
    ],
    scales: [
        'M10 3v14',
        'M6 17h8',
        'M3.5 5.5h13',
        'M3.5 5.5l-2 5',
        'M3.5 5.5l2 5',
        'M16.5 5.5l-2 5',
        'M16.5 5.5l2 5',
        'M1.5 10.5a2 2 0 0 0 4 0z',
        'M14.5 10.5a2 2 0 0 0 4 0z',
    ],
    'money-bag': [
        'M7.5 5.5h5l-1-3h-3z',
        'M7.5 5.5C4 8 3 11 3 13.5a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4c0-2.5-1-5.5-4.5-8',
        'M10 9v6.5',
        'M11.8 10.2a2 1.4 0 0 0-1.8-.7c-1 0-1.8.6-1.8 1.4s.8 1.1 1.8 1.4 1.8.6 1.8 1.4-.8 1.4-1.8 1.4a2 1.4 0 0 1-1.8-.7',
    ],
    question: [
        'M6.5 7a3.5 3.5 0 1 1 5.2 3c-1.1.6-1.7 1.3-1.7 2.5v.5',
        'M10 17h.01',
    ],
    'question-round': [
        'M2 10a8 8 0 1 0 16 0a8 8 0 1 0-16 0',
        'M7.8 8a2.3 2.3 0 1 1 3.3 2c-.7.4-1.1.9-1.1 1.7',
        'M10 14.5h.01',
    ],
    clover: [
        'M7.4 6.3a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0',
        'M10.9 9.8a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0',
        'M3.9 9.8a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0',
        'M10 12.5c.5 2.5 1.5 4 3 5.5',
    ],
    envelope: ['M2.5 5h15v10.5h-15z', 'M2.5 5l7.5 6 7.5-6'],
    gift: [
        'M3.5 9h13v8.5h-13z',
        'M2.5 6h15v3h-15z',
        'M10 6v11.5',
        'M10 6C8.5 3 5.5 2.8 5.8 4.6 6 5.8 8 6 10 6c2 0 4-.2 4.2-1.4C14.5 2.8 11.5 3 10 6z',
    ],
    heart: [
        'M10 17s-7-4.3-7-9.2A3.8 3.8 0 0 1 10 5.6a3.8 3.8 0 0 1 7 2.2C17 12.7 10 17 10 17z',
    ],
} satisfies Record<string, string[]>;

export type IconProps = {
    name: IconName;
    /** Position of the top-left corner and side of the square icon, in mm. */
    x: number;
    y: number;
    size: number;
    color: string;
    strokeWidth?: number;
};

/** One icon set (B87): viewBox 20, round line ends, drawn as flat lines. */
export const Icon = ({
    name,
    x,
    y,
    size,
    color,
    strokeWidth = 1.75,
}: IconProps) => {
    return (
        <svg
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: mm(size),
                height: mm(size),
                // A line on the edge of the grid keeps its full width.
                overflow: 'visible',
            }}
            viewBox="0 0 20 20"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            data-icon={name}
        >
            {PATHS[name].map((d) => (
                <path key={d} d={d} />
            ))}
        </svg>
    );
};

/** Every drawing in the set, for tests and the icon picker. */
const iconName = keyOf(PATHS);

export const isIconName = (key: string) => is(iconName, key);
