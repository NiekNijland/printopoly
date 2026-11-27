import { mix, withAlpha } from '@/lib/render/color';
import type { PawnStyle } from '@/lib/render/edition-part-styles';
import { mm } from '@/lib/render/units';

import { ruleColor } from './board-look';
import { FitText } from './fit-text';
import { PANEL_HEIGHT, PAWN_WIDTH, PORTRAIT } from './pawn-layout';
import { blockColor, pieceText, seedOf, vintagePaper } from './piece-styles';
import { Abs, useRender, Svg } from './sheet';

/**
 * The fine overlapping rings behind the medallion of a banknote: rings around the corners and the middle of a grid
 * of small tiles, over a box of `w` by `h` mm. Plain circles, no SVG pattern: Chrome prints a pattern as a blurry
 * picture, a circle stays a sharp line. Draw it in an SVG that clips, such as `Art` with `clip`.
 */
const GuillocheRings = ({
    w,
    h,
    color,
    size = 3,
    strokeMm = 0.07,
}: {
    w: number;
    h: number;
    color: string;
    size?: number;
    strokeMm?: number;
}) => {
    const centres: [number, number][] = [];
    for (let y = 0; y <= h + size; y += size) {
        for (let x = 0; x <= w + size; x += size) {
            centres.push([x, y]);
            centres.push([x + size / 2, y + size / 2]);
        }
    }

    return (
        <g fill="none" stroke={color} strokeWidth={strokeMm}>
            {centres.flatMap(([cx, cy]) =>
                [0.25, 0.5, 0.75].map((f) => (
                    <circle
                        key={`${cx.toFixed(2)}-${cy.toFixed(2)}-${String(f)}`}
                        cx={cx}
                        cy={cy}
                        r={size * f}
                    />
                )),
            )}
        </g>
    );
};
/** A round badge with a scalloped edge around a centre, for the initial of a pawn in Speels. */
const scallopedCircle = (
    cx: number,
    cy: number,
    r: number,
    bumps: number,
): string => {
    const point = (i: number) => {
        const angle = (2 * Math.PI * i) / bumps - Math.PI / 2;

        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
    };
    const chord = 2 * r * Math.sin(Math.PI / bumps);
    const start = point(0);
    let d = `M${start[0].toFixed(3)} ${start[1].toFixed(3)}`;
    for (let i = 1; i <= bumps; i++) {
        const [px, py] = point(i);
        d += `A${(chord / 2).toFixed(3)} ${(chord / 2).toFixed(3)} 0 0 1 ${px.toFixed(3)} ${py.toFixed(3)}`;
    }

    return `${d}Z`;
};
/** The first letter of the name in a round stamp, where a pawn without a photo would have one. */
export const Initial = ({
    name,
    look,
}: {
    name: string;
    look: PawnStyle | undefined;
}) => {
    const { theme } = useRender();
    const letter = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '';
    const size = Math.min(PORTRAIT.w, PORTRAIT.h) - 1;
    const text = pieceText(look, 'name');

    if (look === 'vintage') {
        return <VintageInitial letter={letter} />;
    }

    if (look === 'modern') {
        return (
            <>
                <Abs
                    {...PORTRAIT}
                    slot="initial"
                    style={{ background: blockColor(theme) }}
                />
                {letter !== '' && (
                    <FitText
                        text={letter}
                        x={PORTRAIT.x + 1.6}
                        y={PORTRAIT.y + 0.6}
                        w={PORTRAIT.w - 3.2}
                        h={PORTRAIT.h - 1.4}
                        maxFontMm={17}
                        minFontMm={6}
                        font="heading"
                        family={text.family}
                        weight={text.weight}
                        align="left"
                        valign="bottom"
                        lineHeight={0.9}
                        color={theme.paper}
                        slot="initial-letter"
                    />
                )}
            </>
        );
    }

    if (look === 'playful') {
        return <PlayfulInitial letter={letter} seed={seedOf(name)} />;
    }

    return (
        <>
            <Abs
                x={PORTRAIT.x + (PORTRAIT.w - size) / 2}
                y={PORTRAIT.y + (PORTRAIT.h - size) / 2}
                w={size}
                h={size}
                slot="initial"
                style={{
                    borderRadius: '50%',
                    background: withAlpha(theme.accent, 0.18),
                    border: `${mm(Math.max(0.35, theme.frameMm))} solid ${theme.ink}`,
                    boxSizing: 'border-box',
                }}
            />
            {letter !== '' && (
                <FitText
                    text={letter}
                    x={PORTRAIT.x}
                    y={PORTRAIT.y}
                    w={PORTRAIT.w}
                    h={PORTRAIT.h}
                    maxFontMm={9}
                    minFontMm={4}
                    font="heading"
                    align="center"
                    valign="middle"
                    slot="initial-letter"
                />
            )}
        </>
    );
};

/** Vintage: the letter in an oval medallion on fine guilloche rings, like the value on an old banknote. */
const VintageInitial = ({ letter }: { letter: string }) => {
    const { theme } = useRender();
    const rule = ruleColor(theme);
    const cx = PORTRAIT.w / 2;
    const cy = PORTRAIT.h / 2;
    const rx = PORTRAIT.w / 2 - 2.3;
    const ry = PORTRAIT.h / 2 - 2.3;
    const text = pieceText('vintage', 'name');

    return (
        <>
            <Svg {...PORTRAIT} slot="initial" clip>
                <g opacity={0.55}>
                    <GuillocheRings
                        w={PORTRAIT.w}
                        h={PORTRAIT.h}
                        color={rule}
                    />
                </g>
                <rect
                    x={0.15}
                    y={0.15}
                    width={PORTRAIT.w - 0.3}
                    height={PORTRAIT.h - 0.3}
                    fill="none"
                    stroke={rule}
                    strokeWidth={0.3}
                />
                <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill={vintagePaper(theme.paper, 0.3)}
                    stroke={rule}
                    strokeWidth={0.32}
                />
                <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx - 0.65}
                    ry={ry - 0.65}
                    fill="none"
                    stroke={rule}
                    strokeWidth={0.12}
                />
            </Svg>
            {letter !== '' && (
                <FitText
                    text={letter}
                    x={PORTRAIT.x + 3}
                    y={PORTRAIT.y + 3}
                    w={PORTRAIT.w - 6}
                    h={PORTRAIT.h - 6}
                    maxFontMm={10}
                    minFontMm={4}
                    font="heading"
                    family={text.family}
                    weight={text.weight}
                    align="center"
                    valign="middle"
                    color={theme.accent}
                    slot="initial-letter"
                />
            )}
        </>
    );
};

/** Speels: the letter, a little turned, on a scalloped badge with a stitched ring. */
const PlayfulInitial = ({ letter, seed }: { letter: string; seed: number }) => {
    const { theme } = useRender();
    const cx = PORTRAIT.w / 2;
    const cy = PORTRAIT.h / 2;
    const r = Math.min(PORTRAIT.w, PORTRAIT.h) / 2 - 1.3;
    const turn = seed % 2 === 0 ? -8 : 7;
    const text = pieceText('playful', 'name');

    return (
        <>
            <Svg {...PORTRAIT} slot="initial">
                <path
                    d={scallopedCircle(cx, cy, r, 14)}
                    fill={mix(theme.paper, blockColor(theme), 0.22)}
                    stroke={theme.ink}
                    strokeWidth={0.35}
                    strokeLinejoin="round"
                />
                <circle
                    cx={cx}
                    cy={cy}
                    r={r - 1.9}
                    fill="none"
                    stroke={blockColor(theme)}
                    strokeWidth={0.28}
                    strokeDasharray="0.9 0.7"
                    strokeLinecap="round"
                />
            </Svg>
            {letter !== '' && (
                <Abs
                    x={0}
                    y={0}
                    w={PAWN_WIDTH}
                    h={PANEL_HEIGHT}
                    style={{
                        transform: `rotate(${String(turn)}deg)`,
                        transformOrigin: `${mm(PORTRAIT.x + cx)} ${mm(PORTRAIT.y + cy)}`,
                    }}
                >
                    <FitText
                        text={letter}
                        x={PORTRAIT.x + 3}
                        y={PORTRAIT.y + 3}
                        w={PORTRAIT.w - 6}
                        h={PORTRAIT.h - 6}
                        maxFontMm={10}
                        minFontMm={4}
                        font="heading"
                        family={text.family}
                        weight={text.weight}
                        align="center"
                        valign="middle"
                        slot="initial-letter"
                    />
                </Abs>
            )}
        </>
    );
};
