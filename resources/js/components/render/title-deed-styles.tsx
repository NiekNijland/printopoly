import type { CSSProperties } from 'react';

import { mix } from '@/lib/render/color';
import type { DeedStyle } from '@/lib/render/edition-part-styles';
import { PLAYFAIR, SPARTAN, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import type { Rect } from '@/types/print';

import { creamed, diamondPath, engraving } from './card-look';
import { EngravedBorder, ovalItems, rosetteItem } from './card-look-engraving';
import { Ornament } from './card-look-ornament';
import { Squiggle, WobblyTile } from './card-look-playful';
import { Abs, useRender, Svg } from './sheet';

/**
 * Title deeds in a style of their own (B269), the same family as the board styles (B268), front and mortgage back:
 *
 * - Vintage: cream paper in a guilloche border like an old banknote, a hatched colour block with a double rule,
 *   Playfair in spaced capitals, fine leader lines from each rent to its amount, and the mortgage in an oval plate
 *   over a rosette.
 * - Modern: the colour block runs off the top edge, the name large and left-aligned, the rent rows striped in a
 *   tint of the group colour with heavy amounts, and no frame.
 * - Speels (playful): a paper tile with a hand-drawn edge on a tint of the group colour, the block as a scalloped
 *   awning, names as typed, a wavy rule and the mortgage on a tinted tile.
 *
 * The layout (block, table, rule, costs, mortgage box) stays where the theme look has it, so the rows keep their
 * size at print size and the fit check measures the same boxes; only lines, letters and shapes change.
 */

/** Inset of the border of Vintage on a deed, and its band. */
const V_INSET = 1.7;
const V_BAND = 1.4;

/** The colours a style draws with: the engraving of Vintage, a tint of the block for Modern and Speels. */
const tint = (band: string, paper: string, street: boolean, theme: Theme) => {
    return street ? mix(band, paper, 0.84) : mix(theme.ink, paper, 0.93);
};

/** The paper of the deed in a style, into the bleed. */
export const styledDeedPaper = (
    theme: Theme,
    style: DeedStyle,
    band: string,
    street: boolean,
): string => {
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
};

/** The frame of a deed in a style; Modern has none. */
export const StyledDeedFrame = ({
    style,
    w,
    h,
    seed,
}: {
    style: DeedStyle;
    w: number;
    h: number;
    seed: number;
}) => {
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
                    opaque
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
};

/** Font props for `FitText` per text of the deed. */
type TextLook = {
    family?: string;
    weight?: number;
    caps?: boolean;
    letterSpacingEm?: number;
};

export type DeedLook = {
    label: TextLook;
    name: TextLook;
    /** The big mortgage value. */
    value: TextLook;
    /** The amounts in the rent table. */
    amount: CSSProperties;
};

export const deedLookOf = (style: DeedStyle): DeedLook => {
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
};

/** The line between the rent table and the costs in a style. */
export const StyledDeedRule = ({
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
}) => {
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
};

/** How a row of the rent table is drawn in a style: leaders, stripes and the weight of the amounts. */
export const styledRowStyle = (
    style: DeedStyle,
    index: number,
    band: string,
    street: boolean,
    theme: Theme,
): { row: CSSProperties; leader: CSSProperties | null } => {
    switch (style) {
        case 'vintage':
            return {
                row: {},
                leader: {
                    flex: 1,
                    alignSelf: 'flex-end',
                    marginBottom: '0.9em',
                    borderBottom: `${mm(0.12)} solid ${mix(engraving(theme, theme.deedFrame), theme.deedPaper, 0.35)}`,
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
                    borderBottom: `${mm(0.25)} solid ${mix(theme.ink, theme.deedPaper, 0.7)}`,
                },
            };
    }
};

const VintageMortgageBox = ({ x, y, w, h }: Rect) => {
    const { theme } = useRender();
    const engr = engraving(theme, theme.deedFrame);

    return (
        // The oval and its rosette as one picture per size in print (B269).
        <Ornament
            x={x - 1.5}
            y={y}
            w={w + 3}
            h={h}
            slot="mortgage-box"
            items={[
                ...ovalItems({
                    x: 0,
                    y: 0,
                    w: w + 3,
                    h,
                    color: engr,
                    fill: mix(creamed(theme.deedPaper), '#FFFFFF', 0.5),
                }),
                rosetteItem({
                    cx: w / 2 + 1.5,
                    cy: h / 2,
                    r: Math.min(h / 2 - 1.6, 16),
                    color: engr,
                    alpha: 0.22,
                    count: 28,
                }),
            ]}
        />
    );
};

/** The box with the mortgage on the back, in a style. */
export const StyledMortgageBox = ({
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
}) => {
    const { theme } = useRender();

    switch (style) {
        case 'vintage':
            return <VintageMortgageBox x={x} y={y} w={w} h={h} />;
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
                    slot="mortgage-box"
                />
            );
    }
};
