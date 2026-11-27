import { ruleColor } from './board-look';
import { vintageLid } from './box-lid-colors';
import { Art, Rope, Rosette, diamond } from './piece-styles';
import { useRender } from './sheet';

/** The sizes of the banknote border, in mm from the edge of the lid. */
const BORDER = {
    outer: 4.2,
    outerHair: 4.9,
    bandFrom: 5.5,
    bandTo: 9.5,
    innerHair: 10.1,
    inner: 10.8,
} as const;

/** Vintage: the border of an engraved banknote. */
export const VintageBorder = ({ w, h }: { w: number; h: number }) => {
    const { theme } = useRender();
    const color = ruleColor(theme);
    const paper = vintageLid(theme);
    const band = BORDER.bandTo - BORDER.bandFrom;
    const rect = (inset: number, stroke: number) => (
        <rect
            x={inset}
            y={inset}
            width={w - 2 * inset}
            height={h - 2 * inset}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
        />
    );
    const lozenge = 3.6;
    const middles: [number, number][] = [
        [w / 2, (BORDER.bandFrom + BORDER.bandTo) / 2],
        [w / 2, h - (BORDER.bandFrom + BORDER.bandTo) / 2],
        [(BORDER.bandFrom + BORDER.bandTo) / 2, h / 2],
        [w - (BORDER.bandFrom + BORDER.bandTo) / 2, h / 2],
    ];

    return (
        <Art x={0} y={0} w={w} h={h} slot="lid-border">
            {rect(BORDER.outer, 0.45)}
            {rect(BORDER.outerHair, 0.14)}
            <BorderRopes w={w} h={h} band={band} color={color} />
            {rect(BORDER.innerHair, 0.14)}
            {rect(BORDER.inner, 0.35)}
            <BorderCorners w={w} h={h} color={color} paper={paper} />
            {middles.map(([cx, cy]) => (
                <g key={`${String(cx)}-${String(cy)}`}>
                    <path
                        d={diamond(cx, cy, lozenge)}
                        fill={paper}
                        stroke={color}
                        strokeWidth={0.35}
                    />
                    <path
                        d={diamond(cx, cy, lozenge - 0.9)}
                        fill="none"
                        stroke={color}
                        strokeWidth={0.12}
                    />
                    <path d={diamond(cx, cy, 0.8)} fill={color} />
                </g>
            ))}
        </Art>
    );
};

const BorderRopes = ({
    w,
    h,
    band,
    color,
}: {
    w: number;
    h: number;
    band: number;
    color: string;
}) => {
    return (
        <>
            {/* The rope along the four sides; the corner boxes cover where they meet. */}
            {[
                `translate(${String(BORDER.bandFrom)} ${String(BORDER.bandFrom)})`,
                `translate(${String(BORDER.bandFrom)} ${String(h - BORDER.bandTo)})`,
            ].map((transform) => (
                <g key={transform} transform={transform}>
                    <Rope
                        length={w - 2 * BORDER.bandFrom}
                        band={band}
                        color={color}
                    />
                </g>
            ))}
            {[
                `translate(${String(BORDER.bandTo)} ${String(BORDER.bandFrom)}) rotate(90)`,
                `translate(${String(w - BORDER.bandFrom)} ${String(BORDER.bandFrom)}) rotate(90)`,
            ].map((transform) => (
                <g key={transform} transform={transform}>
                    <Rope
                        length={h - 2 * BORDER.bandFrom}
                        band={band}
                        color={color}
                    />
                </g>
            ))}
        </>
    );
};

const BorderCorners = ({
    w,
    h,
    color,
    paper,
}: {
    w: number;
    h: number;
    color: string;
    paper: string;
}) => {
    const box = BORDER.inner - BORDER.outer;
    const corners: [number, number][] = [
        [BORDER.outer, BORDER.outer],
        [w - BORDER.inner, BORDER.outer],
        [w - BORDER.inner, h - BORDER.inner],
        [BORDER.outer, h - BORDER.inner],
    ];

    return corners.map(([x, y]) => (
        <g key={`${String(x)}-${String(y)}`} data-slot="lid-corner">
            <rect
                x={x}
                y={y}
                width={box}
                height={box}
                fill={paper}
                stroke={color}
                strokeWidth={0.35}
            />
            <rect
                x={x + 0.6}
                y={y + 0.6}
                width={box - 1.2}
                height={box - 1.2}
                fill="none"
                stroke={color}
                strokeWidth={0.12}
            />
            <Rosette
                cx={x + box / 2}
                cy={y + box / 2}
                r={box / 2 - 1.2}
                color={color}
            />
        </g>
    ));
};
