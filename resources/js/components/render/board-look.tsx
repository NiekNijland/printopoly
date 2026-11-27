import type { ReactNode } from 'react';

import { mix } from '@/lib/render/color';
import type { BoardStyle } from '@/lib/render/edition-part-styles';
import { partStyleOf } from '@/lib/render/style';
import { PLAYFAIR, SPARTAN, type Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { usesCaps } from './caps';
import { useRender } from './sheet';

/**
 * The look of the spaces and corners of the board in the style the edition chose for the board (B268), on top of
 * its theme. Every style keeps the colours of the theme (ink, accents, deck and group colours) and only the fonts
 * the print page loads (League Spartan 800, Playfair Display 700, Instrument Sans). Absent is the theme's own look
 * (B266), drawn exactly as before.
 *
 * - Vintage: cream paper, a fine double rule inside every space like an engraved banknote, a hatched colour band,
 *   Playfair in spaced capitals and the price in a cut-corner cartouche.
 * - Modern: flat colour blocks, the name large inside the band, a heavy price with a short bar, no ornaments.
 * - Speels (playful): rounded tiles with a hand-drawn edge on the board colour, a scalloped awning for the band,
 *   names as typed and the price on a pill.
 */
export type BoardLook = {
    style: BoardStyle | undefined;
    /** The letters of names (streets, corners): as `FitText` props. */
    name: TextLook;
    /** The letters of prices, amounts and short lines. */
    figure: TextLook;
};

/** Font props for `FitText`. */
type TextLook = {
    font: 'heading' | 'body';
    family?: string;
    weight?: number;
    caps: boolean;
    letterSpacingEm?: number;
};

export const boardLookOf = (
    theme: Theme,
    style: BoardStyle | undefined,
): BoardLook => {
    switch (style) {
        case 'vintage':
            return {
                style,
                name: {
                    font: 'heading',
                    family: PLAYFAIR,
                    weight: 700,
                    caps: true,
                    letterSpacingEm: 0.04,
                },
                figure: {
                    font: 'heading',
                    family: PLAYFAIR,
                    weight: 700,
                    caps: false,
                },
            };
        case 'modern':
            return {
                style,
                name: {
                    font: 'heading',
                    family: SPARTAN,
                    weight: 800,
                    caps: true,
                    letterSpacingEm: -0.01,
                },
                figure: {
                    font: 'heading',
                    family: SPARTAN,
                    weight: 800,
                    caps: false,
                },
            };
        case 'playful':
            return {
                style,
                name: {
                    font: 'heading',
                    family: SPARTAN,
                    weight: 800,
                    caps: false,
                },
                figure: {
                    font: 'heading',
                    family: SPARTAN,
                    weight: 800,
                    caps: false,
                },
            };
        case undefined:
            return {
                style,
                name: { font: 'heading', caps: usesCaps(theme) },
                figure: { font: 'body', weight: 600, caps: false },
            };
    }
};

/** The board look of the edition being drawn, from the render context. */
export const useBoardLook = (): BoardLook => {
    const { theme, style } = useRender();

    return boardLookOf(theme, partStyleOf(style, 'board'));
};

/** The cream of Vintage paper, mixed into the colours of the theme so every theme keeps its own tint. */
export const CREAM = '#F1E6C8';

/** The paper of a space in a style: the theme's colour, warmed to cream in Vintage, a clean paper in Modern. */
export const spacePaper = (
    theme: Theme,
    style: BoardStyle | undefined,
    base: string,
): string => {
    switch (style) {
        case 'vintage':
            return mix(base, CREAM, 0.75);
        case 'modern':
            return base === theme.boardBackground ? theme.paper : base;
        case 'playful':
        case undefined:
            return base;
    }
};

/** The colour of the fine rules of Vintage: the accent of the theme, softened so the rules read as engraving. */
export const ruleColor = (theme: Theme): string => {
    return mix(theme.accent, theme.ink, 0.25);
};

/** The space between the tile of Speels and the edge of its space. */
export const TILE_GAP = 0.9;

/** The corner radius of a tile of Speels. */
export const TILE_RADIUS = 2.6;

/** The inset of the double rule of Vintage. */
export const RULE_INSET = 1.3;

export const Svg = ({
    x,
    y,
    w,
    h,
    slot,
    clip = false,
    children,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    slot: string;
    clip?: boolean;
    children: ReactNode;
}) => {
    return (
        <svg
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: mm(w),
                height: mm(h),
                overflow: clip ? 'hidden' : 'visible',
            }}
            viewBox={`0 0 ${String(w)} ${String(h)}`}
            aria-hidden="true"
            data-slot={slot}
        >
            {children}
        </svg>
    );
};

/** A quarter disc in the outer corner of a corner space, the flat colour block of Modern. */
export const QuarterDisc = ({
    size,
    radius,
    color,
}: {
    size: number;
    radius: number;
    color: string;
}) => {
    return (
        <Svg x={0} y={0} w={size} h={size} slot="quarter" clip>
            <circle cx={size} cy={size} r={radius} fill={color} />
        </Svg>
    );
};
