import { withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';
import type { Space } from '@/types/game';

import { useBoardLook } from './board-look';
import { ColorBand, groupColor } from './board-space-parts';
import { FitText } from './fit-text';
import {
    BAND_OPACITY,
    BOTTOM_SCRIM,
    LIGHT_TEXT_SHADOW,
    PhotoSlot,
} from './photo-slot';
import { Abs, useRender } from './sheet';

type FullSpaceProps = {
    space: Space;
    bleed: number;
    w: number;
    h: number;
    /** Height of the colour bar; 0 for stations and utilities, which have none. */
    bar: number;
    title: string;
    town?: string;
    price: string;
    photo?: PhotoSource;
};

/**
 * The photo fills the space under the colour bar (B124, after the town editions of the original game): the
 * name sits on a light band across the top of the photo and the price in white on a dark fade at the bottom.
 * The photo runs on into the bleed on the sides, the bottom and, without a bar, the top.
 */
export const FullSpace = ({
    space,
    bleed,
    w,
    h,
    bar,
    title,
    town,
    price,
    photo,
}: FullSpaceProps) => {
    const { theme, style } = useRender();
    const look = useBoardLook();
    const photoTop = bar === 0 ? -bleed : bar;

    return (
        <>
            {space.type === 'street' && (
                <ColorBand
                    bleed={bleed}
                    w={w}
                    bar={bar}
                    color={
                        style?.groupColors?.[space.group] ??
                        groupColor(space.group, theme)
                    }
                    town={town}
                />
            )}
            <PhotoSlot
                x={-bleed}
                y={photoTop}
                w={w + 2 * bleed}
                h={h + bleed - photoTop}
                photo={photo}
            />
            <FullSpaceScrim bleed={bleed} w={w} h={h} />
            <FullSpaceName bar={bar} bleed={bleed} w={w} title={title} />
            <Abs
                x={0}
                y={0}
                w={w}
                h={h}
                style={{ textShadow: LIGHT_TEXT_SHADOW }}
            >
                <FitText
                    text={price}
                    x={2}
                    y={h - 9}
                    w={w - 4}
                    h={7}
                    maxFontMm={3.6}
                    minFontMm={2}
                    {...look.figure}
                    color="#FFFFFF"
                    align="center"
                    slot="price"
                />
            </Abs>
        </>
    );
};

const FullSpaceScrim = ({
    bleed,
    w,
    h,
}: {
    bleed: number;
    w: number;
    h: number;
}) => {
    const scrimHeight = 15;
    const plate = Math.min(w - 3, 17);

    return (
        <>
            <Abs
                x={-bleed}
                y={h - scrimHeight}
                w={w + 2 * bleed}
                h={scrimHeight + bleed}
                style={{ background: BOTTOM_SCRIM }}
                slot="scrim"
            />
            {/* A dark plate right behind the price, so it reads on a dark or busy photo too (ronde 3, UX 1). */}
            <Abs
                x={w / 2 - plate / 2}
                y={h - 8.5}
                w={plate}
                h={6}
                style={{
                    background: 'rgba(0, 0, 0, 0.62)',
                    borderRadius: mm(3),
                }}
                slot="price-plate"
            />
        </>
    );
};

const FullSpaceName = ({
    bar,
    bleed,
    w,
    title,
}: {
    bar: number;
    bleed: number;
    w: number;
    title: string;
}) => {
    const { theme } = useRender();
    const look = useBoardLook();
    const bandHeight = 15.5;

    return (
        <>
            <Abs
                x={-bleed}
                y={bar}
                w={w + 2 * bleed}
                h={bandHeight}
                style={{
                    background: withAlpha(theme.paper, BAND_OPACITY),
                    boxSizing: 'border-box',
                    borderBottom: `0.2mm solid ${theme.line}`,
                }}
                slot="name-band"
            />
            <FitText
                text={title}
                x={2}
                y={bar + 1.8}
                w={w - 4}
                h={bandHeight - 3.2}
                maxFontMm={3.8}
                minFontMm={2}
                wrap="words"
                {...look.name}
                lineHeight={1.05}
                align="center"
                slot="name"
            />
        </>
    );
};
