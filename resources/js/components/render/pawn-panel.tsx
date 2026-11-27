import { mix, withAlpha } from '@/lib/render/color';
import type { PawnStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';

import { ruleColor, wobblyRect } from './board-look';
import { NAME_BOX, PANEL_HEIGHT, PAWN_WIDTH, PORTRAIT } from './pawn-layout';
import { PhotoSlot } from './photo-slot';
import { Art, diamond, vintagePaper } from './piece-styles';
import { Abs, useRender } from './sheet';

/** The photo in the portrait, with the edge of the style around it. */
export const Portrait = ({
    photo,
    look,
}: {
    photo: PhotoSource;
    look: PawnStyle | undefined;
}) => {
    const { theme } = useRender();

    if (look === 'playful') {
        const radius = 2.4;

        return (
            <>
                <Abs
                    {...PORTRAIT}
                    style={{ borderRadius: mm(radius), overflow: 'hidden' }}
                >
                    <PhotoSlot
                        x={0}
                        y={0}
                        w={PORTRAIT.w}
                        h={PORTRAIT.h}
                        photo={photo}
                    />
                </Abs>
                <Art {...PORTRAIT} slot="photo-edge">
                    <rect
                        x={0.15}
                        y={0.15}
                        width={PORTRAIT.w - 0.3}
                        height={PORTRAIT.h - 0.3}
                        rx={radius}
                        fill="none"
                        stroke={theme.ink}
                        strokeWidth={0.35}
                    />
                </Art>
                <Tape x={PORTRAIT.x + 1.4} y={PORTRAIT.y + 1.1} turn={-38} />
            </>
        );
    }

    return (
        <>
            <PhotoSlot {...PORTRAIT} photo={photo} />
            {look === 'vintage' && (
                <Art {...PORTRAIT} slot="photo-edge">
                    <rect
                        x={0.15}
                        y={0.15}
                        width={PORTRAIT.w - 0.3}
                        height={PORTRAIT.h - 0.3}
                        fill="none"
                        stroke={ruleColor(theme)}
                        strokeWidth={0.3}
                    />
                    <rect
                        x={0.85}
                        y={0.85}
                        width={PORTRAIT.w - 1.7}
                        height={PORTRAIT.h - 1.7}
                        fill="none"
                        stroke={theme.paper}
                        strokeWidth={0.14}
                    />
                </Art>
            )}
        </>
    );
};

/** A strip of paper tape over a corner, Speels. */
const Tape = ({ x, y, turn }: { x: number; y: number; turn: number }) => {
    const { theme } = useRender();
    const w = 6.2;
    const h = 2.2;

    return (
        <Abs
            x={x - w / 2}
            y={y - h / 2}
            w={w}
            h={h}
            slot="tape"
            style={{
                background: withAlpha(
                    mix(theme.paper, theme.secondaryAccent, 0.45),
                    0.8,
                ),
                transform: `rotate(${String(turn)}deg)`,
            }}
        />
    );
};

/** What a style draws under the face of one panel: the cream and rules of Vintage, the tile of Speels. */
export const PanelBackdrop = ({
    look,
    seed,
}: {
    look: PawnStyle | undefined;
    seed: number;
}) => {
    const { theme } = useRender();
    const w = PAWN_WIDTH;
    const h = PANEL_HEIGHT;

    if (look === 'vintage') {
        return (
            <>
                <Abs
                    x={0}
                    y={0}
                    w={w}
                    h={h}
                    style={{ background: vintagePaper(theme.paper) }}
                />
                <VintagePanelRules color={ruleColor(theme)} />
            </>
        );
    }

    if (look === 'playful') {
        return (
            <>
                <Abs
                    x={0}
                    y={0}
                    w={w}
                    h={h}
                    style={{ background: theme.boardBackground }}
                />
                <Art x={0} y={0} w={w} h={h} slot="tile">
                    <path
                        d={wobblyRect(
                            0.55,
                            0.55,
                            w - 1.1,
                            h - 1.1,
                            2.6,
                            seed,
                            0.16,
                        )}
                        fill={theme.paper}
                        stroke={theme.ink}
                        strokeWidth={0.4}
                        strokeLinejoin="round"
                    />
                </Art>
            </>
        );
    }

    return null;
};

/** The double rule of Vintage around a panel, with a diamond in each corner and a double rule between the halves. */
export const VintagePanelRules = ({
    color,
    split = true,
}: {
    color: string;
    split?: boolean;
}) => {
    const w = PAWN_WIDTH;
    const h = PANEL_HEIGHT;
    // Off the cut edge, so a cut a little beside the line still leaves an even frame.
    const outer = 0.75;
    const inner = 1.15;
    const middle = NAME_BOX.x - 0.75;

    return (
        <Art x={0} y={0} w={w} h={h} slot="vintage-rules">
            <rect
                x={outer}
                y={outer}
                width={w - 2 * outer}
                height={h - 2 * outer}
                fill="none"
                stroke={color}
                strokeWidth={0.3}
            />
            <rect
                x={inner}
                y={inner}
                width={w - 2 * inner}
                height={h - 2 * inner}
                fill="none"
                stroke={color}
                strokeWidth={0.1}
            />
            {[
                [outer, outer],
                [w - outer, outer],
                [w - outer, h - outer],
                [outer, h - outer],
            ].map(([cx = 0, cy = 0]) => (
                <path
                    key={`${String(cx)}-${String(cy)}`}
                    d={diamond(cx, cy, 0.6)}
                    fill={color}
                />
            ))}
            {split && (
                <path
                    d={`M${String(middle - 0.25)} 2.6V${String(h - 2.6)}M${String(middle + 0.25)} 2.6V${String(h - 2.6)}`}
                    stroke={color}
                    strokeWidth={0.1}
                />
            )}
        </Art>
    );
};
