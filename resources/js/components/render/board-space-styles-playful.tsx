import { mix, readableOn } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';

import { TILE_GAP, useBoardLook } from './board-look';
import { AwningBand, Pill } from './board-look-playful';
import type { StyledPropertyProps } from './board-space-styles';
import { FitText } from './fit-text';
import type { IconName } from './icons';
import { PhotoSlot } from './photo-slot';
import { Frame, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

export const PlayfulProperty = ({
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
    const look = useBoardLook();
    const edge = TILE_GAP + 1.3;
    const bar = street ? h * 0.21 : 0;
    const framed = photo !== undefined;
    const nameTop = (street ? edge + bar : edge + 1) + (framed ? 1 : 1.8);
    const nameHeight = framed ? 9.5 : h * 0.3;
    const pillH = 6.4;
    const pillTop = h - edge - 0.6 - pillH;
    const mediaTop = nameTop + nameHeight + 0.6;
    const mediaHeight = pillTop - 1.4 - mediaTop;
    const iconSize = Math.min(w - 12, mediaHeight, 24);

    return (
        <>
            {street && (
                <PlayfulBand
                    w={w}
                    edge={edge}
                    bar={bar}
                    color={color}
                    town={town}
                />
            )}
            <FitText
                text={title}
                x={edge}
                y={nameTop}
                w={w - 2 * edge}
                h={nameHeight}
                maxFontMm={framed ? 3.8 : 4.6}
                minFontMm={2}
                wrap="words"
                {...look.name}
                lineHeight={1.02}
                align="center"
                valign={framed ? 'middle' : 'top'}
                slot="name"
            />
            <PlayfulMedia
                w={w}
                edge={edge}
                top={mediaTop}
                height={mediaHeight}
                street={street}
                photo={photo}
                icon={icon}
                fallbackIcon={fallbackIcon}
                iconSize={iconSize}
            />
            <PlayfulPricePill w={w} top={pillTop} h={pillH} price={price} />
        </>
    );
};

const PlayfulBand = ({
    w,
    edge,
    bar,
    color,
    town,
}: {
    w: number;
    edge: number;
    bar: number;
    color: string;
    town?: string;
}) => {
    const { theme } = useRender();
    const look = useBoardLook();
    const hasTown = town !== undefined && town !== '';

    return (
        <>
            <AwningBand
                x={edge}
                y={edge}
                w={w - 2 * edge}
                h={bar}
                color={color}
                ink={theme.ink}
            />
            {hasTown && (
                <FitText
                    text={town}
                    x={edge + 1}
                    y={edge + 0.4}
                    w={w - 2 * edge - 2}
                    h={bar * 0.62}
                    maxFontMm={Math.min(2.6, bar * 0.22)}
                    minFontMm={1.5}
                    {...look.figure}
                    letterSpacingEm={0.04}
                    color={readableOn(color)}
                    align="center"
                    slot="town"
                />
            )}
        </>
    );
};

const PlayfulMedia = ({
    w,
    edge,
    top,
    height,
    street,
    photo,
    icon,
    fallbackIcon,
    iconSize,
}: {
    w: number;
    edge: number;
    top: number;
    height: number;
    street: boolean;
    photo?: PhotoSource;
    icon?: SpaceIconSource;
    fallbackIcon: IconName;
    iconSize: number;
}) => {
    const { theme } = useRender();

    return photo !== undefined ? (
        <div
            style={{
                position: 'absolute',
                inset: 0,
            }}
        >
            <PhotoSlot
                x={edge}
                y={top}
                w={w - 2 * edge}
                h={height}
                photo={photo}
            />
            <Frame
                x={edge}
                y={top}
                w={w - 2 * edge}
                h={height}
                color={theme.ink}
                strokeMm={0.35}
                radiusMm={1.6}
            />
        </div>
    ) : (
        !street && (
            <SpaceIconArt
                icon={icon}
                fallback={fallbackIcon}
                x={(w - iconSize) / 2}
                y={top + (height - iconSize) / 2}
                size={iconSize}
                color={theme.ink}
                strokeWidth={1.8}
            />
        )
    );
};

const PlayfulPricePill = ({
    w,
    top: pillTop,
    h: pillH,
    price,
}: {
    w: number;
    top: number;
    h: number;
    price: string;
}) => {
    const { theme } = useRender();
    const look = useBoardLook();

    return (
        <>
            <Pill
                x={w * 0.16}
                y={pillTop}
                w={w * 0.68}
                h={pillH}
                fill={mix(theme.paper, theme.secondaryAccent, 0.2)}
                ink={theme.ink}
            />
            <FitText
                text={price}
                x={w * 0.16 + 1.4}
                y={pillTop + 0.5}
                w={w * 0.68 - 2.8}
                h={pillH - 1}
                maxFontMm={3.4}
                minFontMm={1.8}
                {...look.figure}
                align="center"
                slot="price"
            />
        </>
    );
};
