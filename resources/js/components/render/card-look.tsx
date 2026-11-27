import type { ReactNode } from 'react';

import { mix } from '@/lib/render/color';
import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

/**
 * Drawing pieces shared by the styles of the cards and the title deeds (B269): the same family as the board styles
 * (B268), so a set can match. Vintage draws like an engraved banknote (a guilloche border between two rules, a
 * rosette, a cartouche), Modern needs no ornaments, and Speels gets a hand-drawn tile, a scalloped stamp and
 * confetti. Every piece takes its colours from the theme.
 */

/** The cream of Vintage paper, mixed into a colour of the theme so every theme keeps its own tint. */
const CREAM = '#F1E6C8';

/** A colour of the theme warmed towards cream, the paper of Vintage. */
export const creamed = (base: string, amount = 0.55): string => {
    return mix(base, CREAM, amount);
};

/** The ink of the engraving: the accent of a deck or the frame of a deed, deepened with the ink of the theme. */
export const engraving = (theme: Theme, accent: string): string => {
    return mix(accent, theme.ink, 0.45);
};

/** An SVG in mm over a box, drawn on top of what came before it. */
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
    slot?: string;
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

/** A diamond with its centre at (cx, cy), `d` from the centre to each point. */
export const diamondPath = (cx: number, cy: number, d: number): string => {
    return `M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`;
};
