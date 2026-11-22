import type { CSSProperties } from 'react';

import type { DeedStyle } from '@/lib/edition/part-styles';
import { mix, readableOn } from '@/lib/render/color';
import { PLAYFAIR, SPARTAN, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { Hatch } from './board-look';
import {
    Awning,
    EngravedBorder,
    OvalPlate,
    Rosette,
    Squiggle,
    Svg,
    WobblyTile,
    creamed,
    diamondPath,
    engraving,
    scallopDepth,
} from './card-look';
import { FitText } from './fit-text';
import { Abs, useRender } from './sheet';

/**
 * Title deeds in a style of their own (B269), the same family as the board styles (B268), front and mortgage back:
 *
 * - Vintage: cream paper in a guilloche border like an old banknote, a hatched colour block with a double rule,
 *   Playfair in spaced capitals, dotted leaders from each rent to its amount, and the mortgage in an oval plate
 *   over a rosette.
 * - Modern: the colour block runs off the top edge, the name large and left-aligned, the rent rows striped in a
 *   tint of the group colour with heavy amounts, and no frame.
 * - Speels (playful): a paper tile with a hand-drawn edge on a tint of the group colour, the block as a scalloped
 *   awning, names as typed, a wavy rule and the mortgage on a dashed tile.
 *
 * The layout (block, table, rule, costs, mortgage box) stays where the theme look has it, so the rows keep their
 * size at print size and the fit check measures the same boxes; only lines, letters and shapes change.
 */

/** Inset of the border of Vintage on a deed, and its band. */
const V_INSET = 1.7;
const V_BAND = 1.4;

/** The colours a style draws with: the engraving of Vintage, a tint of the block for Modern and Speels. */
function tint(band: string, paper: string, street: boolean, theme: Theme) {
    return street ? mix(band, paper, 0.84) : mix(theme.ink, paper, 0.93);
}

/** The paper of the deed in a style, into the bleed. */
export function styledDeedPaper(
    theme: Theme,
    style: DeedStyle,
    band: string,
    street: boolean,
): string {
    switch (style) {
        case 'vintage':
            return creamed(theme.deedPaper, 0.5);
        case 'modern':
            return theme.deedPaper;
        case 'playful':
            return street
                ? mix(band, theme.deedPaper, 0.72)
                : theme.boardBackground;
    }
}

/** The frame of a deed in a style; Modern has none. */
export function StyledDeedFrame({
    style,
    w,
    h,
    seed,
}: {
    style: DeedStyle;
    w: number;
    h: number;
    seed: number;
}) {
    const { theme } = useRender();

    switch (style) {
        case 'vintage':
            return (
                <EngravedBorder
                    w={w}
                    h={h}
                    inset={V_INSET}
                    band={V_BAND}
                    color={engraving(theme, theme.deedFrame)}
                    paper={creamed(theme.deedPaper, 0.5)}
                />
            );
        case 'modern':
            return null;
        case 'playful':
            return (
                <WobblyTile
                    x={2.1}
                    y={2.1}
                    w={w - 4.2}
                    h={h - 4.2}
                    radius={4}
                    seed={seed}
                    fill={theme.deedPaper}
                    ink={theme.ink}
                />
            );
    }
}

/** Font props for `FitText` per text of the deed. */
interface TextLook {
    family?: string;
    weight?: number;
    caps?: boolean;
    letterSpacingEm?: number;
}

export interface DeedLook {
    label: TextLook;
    name: TextLook;
    /** The big mortgage value. */
    value: TextLook;
    /** The amounts in the rent table. */
    amount: CSSProperties;
}

export function deedLookOf(style: DeedStyle): DeedLook {
    switch (style) {
        case 'vintage':
            return {
                label: {
                    family: PLAYFAIR,
                    weight: 700,
                    caps: true,
                    letterSpacingEm: 0.22,
                },
                name: {
                    family: PLAYFAIR,
                    weight: 700,
                    caps: true,
                    letterSpacingEm: 0.05,
                },
                value: { family: PLAYFAIR, weight: 700 },
                amount: { fontWeight: 600 },
            };
        case 'modern':
            return {
                label: {
                    family: SPARTAN,
                    weight: 800,
                    caps: true,
                    letterSpacingEm: 0.14,
                },
                name: {
                    family: SPARTAN,
                    weight: 800,
                    caps: true,
                    letterSpacingEm: -0.01,
                },
                value: { family: SPARTAN, weight: 800 },
                amount: { fontFamily: SPARTAN, fontWeight: 800 },
            };
        case 'playful':
            return {
                label: { family: SPARTAN, weight: 800, caps: false },
                name: { family: SPARTAN, weight: 800, caps: false },
                value: { family: SPARTAN, weight: 800 },
                amount: { fontFamily: SPARTAN, fontWeight: 800 },
            };
    }
}

/** The block at the top of both sides in a style: the label, the town if any, and the name. */
export function StyledDeedHeader({
    style,
    w,
    block,
    blockHeight,
    label,
    title,
    townText,
    band,
    onBand,
    street,
    bleed,
    seed,
}: {
    style: DeedStyle;
    w: number;
    /** Inset of the block from the trim edge, and its height (B133). */
    block: number;
    blockHeight: number;
    label: string;
    title: string;
    townText: string | undefined;
    band: string;
    onBand: string;
    street: boolean;
    bleed: number;
    seed: number;
}) {
    const { theme } = useRender();
    const look = deedLookOf(style);
    const hasTown = townText !== undefined;
    const x = block;
    const bw = w - 2 * block;

    if (style === 'modern') {
        const fill = street ? band : theme.ink;
        const on = street ? onBand : theme.deedPaper;
        const bottom = block + blockHeight;

        return (
            <>
                <Abs
                    x={-bleed}
                    y={-bleed}
                    w={w + 2 * bleed}
                    h={bottom + bleed}
                    style={{ background: fill }}
                    slot="band"
                />
                <FitText
                    text={label}
                    x={x}
                    y={3.2}
                    w={hasTown ? bw * 0.6 : bw}
                    h={3}
                    maxFontMm={2.1}
                    minFontMm={1.5}
                    {...look.label}
                    color={on}
                    align="left"
                    slot="label"
                />
                {hasTown && (
                    <FitText
                        text={townText}
                        x={x + bw * 0.6}
                        y={3.2}
                        w={bw * 0.4}
                        h={3}
                        maxFontMm={2.1}
                        minFontMm={1.5}
                        font="body"
                        weight={600}
                        color={on}
                        align="right"
                        slot="town"
                    />
                )}
                <Abs x={x} y={7} w={7} h={0.9} style={{ background: on }} />
                <FitText
                    text={title}
                    x={x}
                    y={8.6}
                    w={bw}
                    h={bottom - 9.6}
                    maxFontMm={6.4}
                    minFontMm={2.2}
                    wrap="words"
                    {...look.name}
                    lineHeight={0.95}
                    color={on}
                    align="left"
                    valign="bottom"
                    slot="name"
                />
            </>
        );
    }

    if (style === 'vintage') {
        const engr = engraving(theme, theme.deedFrame);
        const fill = street
            ? band
            : mix(creamed(theme.deedPaper), '#FFFFFF', 0.5);
        const on = street ? onBand : theme.ink;

        return (
            <>
                <Abs
                    x={x}
                    y={block}
                    w={bw}
                    h={blockHeight}
                    style={{ background: fill }}
                    slot="band"
                />
                {street && (
                    <Hatch
                        x={x}
                        y={block}
                        w={bw}
                        h={blockHeight}
                        color={
                            readableOn(band) === '#FFFFFF'
                                ? mix(band, '#FFFFFF', 0.5)
                                : mix(band, theme.ink, 0.6)
                        }
                        opacity={0.45}
                        strokeMm={0.1}
                    />
                )}
                <Svg x={x} y={block} w={bw} h={blockHeight} slot="band-rule">
                    <rect
                        x={0.15}
                        y={0.15}
                        width={bw - 0.3}
                        height={blockHeight - 0.3}
                        fill="none"
                        stroke={engr}
                        strokeWidth={0.3}
                    />
                    <rect
                        x={0.8}
                        y={0.8}
                        width={bw - 1.6}
                        height={blockHeight - 1.6}
                        fill="none"
                        stroke={street ? on : engr}
                        strokeOpacity={street ? 0.7 : 1}
                        strokeWidth={0.1}
                    />
                    {[2.6, bw - 2.6].map((cx) => (
                        <path
                            key={cx}
                            d={diamondPath(cx, 2.65, 0.55)}
                            fill={street ? on : engr}
                        />
                    ))}
                </Svg>
                <FitText
                    text={label}
                    x={x + 4}
                    y={block + 1.4}
                    w={bw - 8}
                    h={3}
                    maxFontMm={2}
                    minFontMm={1.4}
                    {...look.label}
                    color={on}
                    align="center"
                    slot="label"
                />
                {hasTown && (
                    <FitText
                        text={townText}
                        x={x + 2}
                        y={block + 4.5}
                        w={bw - 4}
                        h={2.8}
                        maxFontMm={2.2}
                        minFontMm={1.4}
                        family={PLAYFAIR}
                        weight={700}
                        caps
                        letterSpacingEm={0.16}
                        color={on}
                        align="center"
                        slot="town"
                    />
                )}
                <FitText
                    text={title}
                    x={x + 2}
                    y={block + (hasTown ? 7.4 : 5)}
                    w={bw - 4}
                    h={hasTown ? 8 : 10}
                    maxFontMm={4.6}
                    minFontMm={2.2}
                    wrap="words"
                    {...look.name}
                    lineHeight={1.05}
                    color={on}
                    align="center"
                    slot="name"
                />
            </>
        );
    }

    // Speels: an awning in the group colour for a street; a dashed tile for a station or a utility.
    const scallop = scallopDepth(bw);
    const textBottom = block + blockHeight - scallop - 0.4;
    const on = street ? onBand : theme.ink;

    return (
        <>
            <Abs x={x} y={block} w={bw} h={blockHeight} slot="band" />
            {street ? (
                <Awning
                    x={x}
                    y={block}
                    w={bw}
                    h={blockHeight}
                    color={band}
                    ink={theme.ink}
                />
            ) : (
                <WobblyTile
                    x={x}
                    y={block}
                    w={bw}
                    h={blockHeight}
                    radius={3}
                    seed={seed + 2}
                    fill={mix(theme.accent, theme.deedPaper, 0.88)}
                    ink={theme.ink}
                    strokeMm={0.35}
                    dashed
                    slot="label-tile"
                />
            )}
            <FitText
                text={label}
                x={x + 3}
                y={block + 1.5}
                w={bw - 6}
                h={3}
                maxFontMm={2.3}
                minFontMm={1.5}
                {...look.label}
                color={on}
                align="center"
                slot="label"
            />
            {hasTown && (
                <FitText
                    text={townText}
                    x={x + 3}
                    y={block + 4.3}
                    w={bw - 6}
                    h={2.8}
                    maxFontMm={2.3}
                    minFontMm={1.4}
                    font="body"
                    weight={600}
                    color={on}
                    align="center"
                    slot="town"
                />
            )}
            <FitText
                text={title}
                x={x + 2.5}
                y={block + (hasTown ? 7 : 5)}
                w={bw - 5}
                h={
                    (street ? textBottom : block + blockHeight - 0.8) -
                    (block + (hasTown ? 7 : 5))
                }
                maxFontMm={5.2}
                minFontMm={2.2}
                wrap="words"
                {...look.name}
                lineHeight={1}
                color={on}
                align="center"
                slot="name"
            />
        </>
    );
}

/** The line between the rent table and the costs in a style. */
export function StyledDeedRule({
    style,
    x,
    y,
    w,
    band,
    street,
}: {
    style: DeedStyle;
    x: number;
    y: number;
    w: number;
    band: string;
    street: boolean;
}) {
    const { theme } = useRender();

    switch (style) {
        case 'vintage': {
            const engr = engraving(theme, theme.deedFrame);

            return (
                <Svg x={x} y={y - 0.5} w={w} h={1.4} slot="rule">
                    <path
                        d={`M0 0.5H${w / 2 - 1.6}M${w / 2 + 1.6} 0.5H${w}`}
                        stroke={engr}
                        strokeWidth={0.28}
                    />
                    <path
                        d={`M0 1.1H${w / 2 - 1.6}M${w / 2 + 1.6} 1.1H${w}`}
                        stroke={engr}
                        strokeWidth={0.1}
                    />
                    <path d={diamondPath(w / 2, 0.8, 0.75)} fill={engr} />
                </Svg>
            );
        }
        case 'modern':
            return (
                <Abs
                    x={x}
                    y={y - 0.3}
                    w={w}
                    h={0.7}
                    style={{ background: street ? band : theme.ink }}
                    slot="rule"
                />
            );
        case 'playful':
            return (
                <Squiggle
                    x={x}
                    y={y}
                    w={w}
                    color={theme.ink}
                    amplitude={0.4}
                    wave={2.6}
                    strokeMm={0.3}
                    slot="rule"
                />
            );
    }
}

/** How a row of the rent table is drawn in a style: leaders, stripes and the weight of the amounts. */
export function styledRowStyle(
    style: DeedStyle,
    index: number,
    band: string,
    street: boolean,
    theme: Theme,
): { row: CSSProperties; leader: CSSProperties | null } {
    switch (style) {
        case 'vintage':
            return {
                row: {},
                leader: {
                    flex: 1,
                    alignSelf: 'flex-end',
                    marginBottom: '0.9em',
                    borderBottom: `${mm(0.3)} dotted ${engraving(theme, theme.deedFrame)}`,
                    opacity: 0.7,
                },
            };
        case 'modern':
            return {
                row: {
                    padding: `0 ${mm(1)}`,
                    background:
                        index % 2 === 0
                            ? tint(band, theme.deedPaper, street, theme)
                            : undefined,
                },
                leader: null,
            };
        case 'playful':
            return {
                row: {},
                leader: {
                    flex: 1,
                    alignSelf: 'flex-end',
                    marginBottom: '0.85em',
                    borderBottom: `${mm(0.45)} dotted ${mix(theme.ink, theme.deedPaper, 0.55)}`,
                },
            };
    }
}

/** The box with the mortgage on the back, in a style. */
export function StyledMortgageBox({
    style,
    x,
    y,
    w,
    h,
    band,
    street,
    seed,
}: {
    style: DeedStyle;
    x: number;
    y: number;
    w: number;
    h: number;
    band: string;
    street: boolean;
    seed: number;
}) {
    const { theme } = useRender();

    switch (style) {
        case 'vintage': {
            const engr = engraving(theme, theme.deedFrame);

            return (
                <>
                    <OvalPlate
                        x={x - 1.5}
                        y={y}
                        w={w + 3}
                        h={h}
                        color={engr}
                        fill={mix(creamed(theme.deedPaper), '#FFFFFF', 0.5)}
                        slot="mortgage-box"
                    />
                    <Rosette
                        cx={x + w / 2}
                        cy={y + h / 2}
                        r={Math.min(h / 2 - 1.6, 16)}
                        color={engr}
                        opacity={0.22}
                        count={32}
                    />
                </>
            );
        }
        case 'modern':
            return (
                <Abs
                    x={x - 3}
                    y={y}
                    w={w + 6}
                    h={h}
                    style={{
                        background: tint(band, theme.deedPaper, street, theme),
                    }}
                    slot="mortgage-box"
                />
            );
        case 'playful':
            return (
                <WobblyTile
                    x={x}
                    y={y}
                    w={w}
                    h={h}
                    radius={5}
                    seed={seed + 9}
                    fill={
                        street
                            ? mix(band, theme.deedPaper, 0.8)
                            : mix(theme.accent, theme.deedPaper, 0.88)
                    }
                    ink={theme.ink}
                    strokeMm={0.4}
                    dashed
                    slot="mortgage-box"
                />
            );
    }
}
