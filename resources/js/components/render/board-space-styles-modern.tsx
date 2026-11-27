import { readableOn } from '@/lib/render/color';

import { useBoardLook } from './board-look';
import type { StyledPropertyProps } from './board-space-styles';
import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';
import { Abs, useRender } from './sheet';
import { SpaceIconArt } from './space-icon';

export const ModernProperty = ({
    w,
    h,
    street,
    title,
    town,
    price,
    color,
    photo,
    icon,
    fallbackIcon,
}: StyledPropertyProps) => {
    const { theme } = useRender();
    const look = useBoardLook();
    // Stations and utilities get a block in ink, so every property has its block of colour.
    const block = street ? color : theme.ink;
    const bar = h * 0.36;
    const framed = photo !== undefined;
    const priceTop = h - 8.6;
    const mediaTop = bar + 2;
    const mediaHeight = priceTop - 1.6 - mediaTop;
    const iconSize = Math.min(w - 10, mediaHeight, 26);

    return (
        <>
            <ModernBlock
                w={w}
                h={bar}
                block={block}
                title={title}
                town={town}
            />
            {framed ? (
                <PhotoSlot
                    x={0}
                    y={bar}
                    w={w}
                    h={priceTop - 1.2 - bar}
                    photo={photo}
                />
            ) : (
                !street && (
                    <SpaceIconArt
                        icon={icon}
                        fallback={fallbackIcon}
                        x={(w - iconSize) / 2}
                        y={mediaTop + (mediaHeight - iconSize) / 2}
                        size={iconSize}
                        color={theme.ink}
                        strokeWidth={2}
                    />
                )
            )}
            <Abs
                x={2.2}
                y={priceTop}
                w={7}
                h={0.9}
                style={{ background: block }}
                slot="price-rule"
            />
            <FitText
                text={price}
                x={2.2}
                y={priceTop + 1.4}
                w={w - 4.4}
                h={5.6}
                maxFontMm={4.4}
                minFontMm={2}
                {...look.figure}
                align="left"
                slot="price"
            />
        </>
    );
};

const ModernBlock = ({
    w,
    h: bar,
    block,
    title,
    town,
}: {
    w: number;
    h: number;
    block: string;
    title: string;
    town?: string;
}) => {
    const look = useBoardLook();
    const text = readableOn(block);
    const hasTown = town !== undefined && town !== '';

    return (
        <>
            <Abs
                x={0}
                y={0}
                w={w}
                h={bar}
                style={{ background: block }}
                slot="color-bar"
            />
            {hasTown && (
                <FitText
                    text={town}
                    x={2.2}
                    y={1.8}
                    w={w - 4.4}
                    h={3.2}
                    maxFontMm={2.3}
                    minFontMm={1.5}
                    font="body"
                    weight={600}
                    caps
                    letterSpacingEm={0.14}
                    color={text}
                    align="left"
                    slot="town"
                />
            )}
            <FitText
                text={title}
                x={2.2}
                y={hasTown ? 5.4 : 2.2}
                w={w - 4.4}
                h={bar - (hasTown ? 7 : 4)}
                maxFontMm={5.4}
                minFontMm={2}
                wrap="words"
                {...look.name}
                lineHeight={0.98}
                color={text}
                align="left"
                valign="bottom"
                slot="name"
            />
        </>
    );
};
