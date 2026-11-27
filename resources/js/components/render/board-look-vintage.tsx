import { RULE_INSET, Svg } from './board-look';

/**
 * The double rule of Vintage: a line and a hairline inside it, like the frame of an engraved banknote, with a
 * small diamond in each corner when `ornaments` is on (the corners of the board).
 */
export const VintageRules = ({
    w,
    h,
    color,
    inset = RULE_INSET,
    ornaments = false,
}: {
    w: number;
    h: number;
    color: string;
    inset?: number;
    ornaments?: boolean;
}) => {
    const inner = inset + 0.75;
    const d = 1.1;

    return (
        <Svg x={0} y={0} w={w} h={h} slot="vintage-rules">
            <rect
                x={inset}
                y={inset}
                width={Math.max(0, w - 2 * inset)}
                height={Math.max(0, h - 2 * inset)}
                fill="none"
                stroke={color}
                strokeWidth={0.32}
            />
            <rect
                x={inner}
                y={inner}
                width={Math.max(0, w - 2 * inner)}
                height={Math.max(0, h - 2 * inner)}
                fill="none"
                stroke={color}
                strokeWidth={0.12}
            />
            {ornaments &&
                [
                    [inset, inset],
                    [w - inset, inset],
                    [w - inset, h - inset],
                    [inset, h - inset],
                ].map(([cx = 0, cy = 0]) => (
                    <path
                        key={`${String(cx)}-${String(cy)}`}
                        d={`M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`}
                        fill={color}
                    />
                ))}
        </Svg>
    );
};

/** Fine diagonal lines over a box, the shading of an engraving. */
export const Hatch = ({
    x,
    y,
    w,
    h,
    color,
    spacing = 0.6,
    strokeMm = 0.1,
    opacity = 0.45,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    spacing?: number;
    strokeMm?: number;
    opacity?: number;
}) => {
    const lines: string[] = [];
    for (let offset = -h; offset < w; offset += spacing) {
        lines.push(
            `M${offset.toFixed(2)} ${h.toFixed(2)}L${(offset + h).toFixed(2)} 0`,
        );
    }

    return (
        <Svg x={x} y={y} w={w} h={h} slot="hatch" clip>
            <path
                d={lines.join('')}
                stroke={color}
                strokeWidth={strokeMm}
                strokeOpacity={opacity}
                fill="none"
            />
        </Svg>
    );
};

/** A label with cut corners and a double line, the price plate of Vintage. */
export const Cartouche = ({
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
}) => {
    const cut = Math.min(1.4, h / 3);
    const path = (i: number) => {
        const c = cut;
        const x0 = i;
        const y0 = i;
        const x1 = w - i;
        const y1 = h - i;

        return `M${x0 + c} ${y0}L${x1 - c} ${y0}L${x1} ${y0 + c}L${x1} ${y1 - c}L${x1 - c} ${y1}L${x0 + c} ${y1}L${x0} ${y1 - c}L${x0} ${y0 + c}Z`;
    };

    return (
        <Svg x={x} y={y} w={w} h={h} slot="cartouche">
            <path
                d={path(0.16)}
                fill={fill}
                stroke={color}
                strokeWidth={0.32}
            />
            <path
                d={path(0.75)}
                fill="none"
                stroke={color}
                strokeWidth={0.12}
            />
        </Svg>
    );
};
