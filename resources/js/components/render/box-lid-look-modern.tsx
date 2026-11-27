import type { Rect } from '@/types/print';

import { useStreetColors } from './box-lid-colors';
import { Art, blockColor } from './piece-styles';
import { Abs, useRender } from './sheet';

/** Modern: a quarter disc in each top corner, bleeding off the edge. */
export const ModernCorners = ({
    w,
    h,
    bleed,
}: {
    w: number;
    h: number;
    bleed: number;
}) => {
    const { theme } = useRender();
    const r = Math.min(w, h) * 0.1;

    return (
        <Art
            x={-bleed}
            y={-bleed}
            w={w + 2 * bleed}
            h={h + 2 * bleed}
            slot="lid-discs"
            clip
        >
            <circle
                cx={bleed}
                cy={bleed}
                r={r + bleed}
                fill={blockColor(theme)}
            />
            <circle
                cx={w + bleed}
                cy={bleed}
                r={r * 0.62 + bleed}
                fill={theme.deckAccent.chance}
            />
        </Art>
    );
};

/** Modern: the street colours as a band of flat blocks along the bottom edge, bleed included. */
export const ModernBand = ({
    y,
    w,
    h,
    bleed,
}: {
    y: number;
    w: number;
    h: number;
    bleed: number;
}) => {
    const colors = useStreetColors();

    return (
        <Abs
            x={-bleed}
            y={y}
            w={w + 2 * bleed}
            h={h - y + bleed}
            style={{ display: 'flex' }}
            slot="lid-strip"
        >
            {colors.map((color, index) => (
                <span key={index} style={{ flex: 1, background: color }} />
            ))}
        </Abs>
    );
};

/** Modern: a flat block in the strong colour of the theme, offset behind a photo or the board. */
export const OffsetBlock = ({ rect }: { rect: Rect }) => {
    const { theme } = useRender();
    const offset = Math.min(4, Math.max(2.5, rect.w * 0.015));

    return (
        <Abs
            x={rect.x + offset}
            y={rect.y + offset}
            w={rect.w}
            h={rect.h}
            slot="offset-block"
            style={{ background: blockColor(theme) }}
        />
    );
};
