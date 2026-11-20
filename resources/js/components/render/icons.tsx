import { mm } from '@/lib/render/units';

type IconName =
    | 'train'
    | 'bulb'
    | 'tap'
    | 'chest'
    | 'car'
    | 'bars'
    | 'arrow-left'
    | 'pointer';

const PATHS: Record<IconName, string[]> = {
    train: [
        'M5 3h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
        'M3 9h14',
        'M6 15l-2 3',
        'M14 15l2 3',
        'M7 12h.01',
        'M13 12h.01',
    ],
    bulb: ['M10 2a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9z', 'M8 16h4', 'M9 18h2'],
    tap: ['M3 7h8a3 3 0 0 1 3 3v1', 'M6 7V4h4v3', 'M14 11v2', 'M14 16v.01'],
    chest: ['M3 8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8H3V8z', 'M3 10h14', 'M10 9v3'],
    car: ['M3 12l2-5h10l2 5v4H3v-4z', 'M3 12h14', 'M6 14h.01', 'M14 14h.01'],
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
