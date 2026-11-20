import { mm } from '@/lib/render/units';

type IconName =
    | 'train'
    | 'bulb'
    | 'tap'
    | 'chest'
    | 'dice'
    | 'car'
    | 'bars'
    | 'arrow-left'
    | 'pointer';

/**
 * Original line drawings on a 20 x 20 grid (B87). Circles are written as arcs so every
 * icon stays a list of plain paths.
 */
const PATHS: Record<IconName, string[]> = {
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
};

export interface IconProps {
    name: IconName;
    /** Position of the top-left corner and side of the square icon, in mm. */
    x: number;
    y: number;
    size: number;
    color: string;
    strokeWidth?: number;
}

/** One icon set (B87): viewBox 20, round line ends, drawn as flat lines. */
export function Icon({
    name,
    x,
    y,
    size,
    color,
    strokeWidth = 1.75,
}: IconProps) {
    return (
        <svg
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: mm(size),
                height: mm(size),
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
}
