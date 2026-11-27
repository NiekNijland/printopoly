import { mix, withAlpha } from '@/lib/render/color';
import type { Rect } from '@/types/print';

import { useStreetColors } from './box-lid-colors';
import {
    Art,
    ConfettiShape,
    blockColor,
    scallopedRect,
    scatter,
} from './piece-styles';
import { Abs, useRender } from './sheet';

/** Speels: a paper doily with a scalloped edge and a stitched line, on the colour of the lid. */
export const PlayfulDoily = ({ w, h }: { w: number; h: number }) => {
    const { theme } = useRender();
    const edge = 7.4;
    const size = 7;
    const stitch = 10;

    return (
        <Art x={0} y={0} w={w} h={h} slot="lid-doily">
            <path
                d={scallopedRect(edge, edge, w - 2 * edge, h - 2 * edge, size)}
                fill={theme.paper}
                stroke={theme.ink}
                strokeWidth={0.5}
                strokeLinejoin="round"
            />
            <rect
                x={stitch}
                y={stitch}
                width={w - 2 * stitch}
                height={h - 2 * stitch}
                rx={4}
                fill="none"
                stroke={blockColor(theme)}
                strokeWidth={0.5}
                strokeDasharray="2.2 1.6"
                strokeLinecap="round"
            />
        </Art>
    );
};

/** Speels: confetti beside the board picture, in the gutters between the stitch and the board. */
export const LidConfetti = ({
    picture,
    w,
    h,
}: {
    picture: Rect;
    w: number;
    h: number;
}) => {
    const { theme } = useRender();
    const streets = useStreetColors();
    const colors = [
        blockColor(theme),
        ...streets,
        theme.deckAccent.chance,
        theme.deckAccent.chest,
    ];
    const gutter = picture.x - 13 - 9;
    if (gutter < 8) {
        return null;
    }
    const unit = Math.min(w, h) / 267;
    const size = 6 * unit;
    const count = Math.max(
        5,
        Math.round((gutter * picture.h) / (420 * unit * unit)),
    );
    const box = (x: number) => ({
        x,
        y: picture.y + 3,
        w: gutter,
        h: picture.h - 6,
    });
    const pieces = [
        ...scatter(11, box(13), count, size, colors),
        ...scatter(29, box(w - 13 - gutter), count, size, colors),
    ];

    return (
        <Art x={0} y={0} w={w} h={h} slot="confetti">
            {pieces.map((piece, index) => (
                <ConfettiShape key={index} piece={piece} />
            ))}
        </Art>
    );
};

/** Speels: two strips of tape over the top corners of the board picture or the photo. */
export const TapeCorners = ({ w, h }: { w: number; h: number }) => {
    const { theme } = useRender();
    const tapeW = Math.min(26, Math.max(12, w * 0.14));
    const tapeH = tapeW * 0.3;
    const fill = withAlpha(mix(theme.paper, theme.secondaryAccent, 0.45), 0.8);
    const piece = (x: number, turn: number) => (
        <Abs
            x={x - tapeW / 2}
            y={-tapeH / 2 + tapeW * 0.08}
            w={tapeW}
            h={tapeH}
            slot="tape"
            style={{
                background: fill,
                transform: `rotate(${String(turn)}deg)`,
            }}
        />
    );

    return (
        <Abs x={0} y={0} w={w} h={h}>
            {piece(tapeW * 0.18, -40)}
            {piece(w - tapeW * 0.18, 40)}
        </Abs>
    );
};
