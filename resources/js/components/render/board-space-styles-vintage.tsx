import { mix, readableOn } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';

import { RULE_INSET, ruleColor, useBoardLook } from './board-look';
import { Cartouche, Hatch } from './board-look-vintage';
import type { StyledPropertyProps } from './board-space-styles';
import { FitText } from './fit-text';
import type { IconName } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

export const VintageProperty = ({
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
    const rule = ruleColor(theme);
    const inner = RULE_INSET + 0.75;
    const bandX = inner + 0.5;
    const bandW = w - 2 * bandX;
    const bar = street ? h * 0.19 : 0;
    const bandTop = bandX;
    const framed = photo !== undefined;
    const nameTop = (street ? bandTop + bar : inner) + (framed ? 1.6 : 2.4);
    const nameHeight = framed ? 9.5 : h * 0.3;
    const plateH = 6.2;
    const plateTop = h - inner - 1.2 - plateH;
    const mediaTop = nameTop + nameHeight + 0.6;
    const mediaHeight = plateTop - 1.2 - mediaTop;
    const iconSize = Math.min(w - 14, mediaHeight, 22);

    return (
        <>
            {street && (
                <VintageBand
                    x={bandX}
                    y={bandTop}
                    w={bandW}
                    h={bar}
                    color={color}
                    rule={rule}
                    town={town}
                />
            )}
            <FitText
                text={title}
                x={inner + 0.8}
                y={nameTop}
                w={w - 2 * inner - 1.6}
                h={nameHeight}
                maxFontMm={framed ? 3.4 : 4.2}
                minFontMm={1.9}
                wrap="words"
                {...look.name}
                lineHeight={1.08}
                align="center"
                valign={framed ? 'middle' : 'top'}
                slot="name"
            />
            <VintageMedia
                w={w}
                x={bandX}
                y={mediaTop}
                boxW={bandW}
                boxH={mediaHeight}
                rule={rule}
                street={street}
                photo={photo}
                icon={icon}
                fallbackIcon={fallbackIcon}
                iconSize={iconSize}
            />
            <VintagePricePlate
                w={w}
                top={plateTop}
                h={plateH}
                rule={rule}
                price={price}
            />
        </>
    );
};

const VintageBand = ({
    x,
    y,
    w,
    h,
    color,
    rule,
    town,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    rule: string;
    town?: string;
}) => {
    const { theme } = useRender();
    const look = useBoardLook();

    return (
        <>
            <Abs
                x={x}
                y={y}
                w={w}
                h={h}
                style={{ background: color }}
                slot="color-bar"
            />
            <Hatch
                x={x}
                y={y}
                w={w}
                h={h}
                color={
                    readableOn(color) === '#FFFFFF'
                        ? mix(color, '#FFFFFF', 0.5)
                        : mix(color, theme.ink, 0.6)
                }
                opacity={0.5}
                strokeMm={0.12}
            />
            <Abs
                x={x}
                y={y + h}
                w={w}
                h={0.32}
                style={{ background: rule }}
                slot="band-rule"
            />
            <Abs
                x={x}
                y={y + h + 0.7}
                w={w}
                h={0.12}
                style={{ background: rule }}
            />
            {town !== undefined && town !== '' && (
                <FitText
                    text={town}
                    x={x + 1}
                    y={y}
                    w={w - 2}
                    h={h}
                    maxFontMm={Math.min(2.4, h * 0.2)}
                    minFontMm={1.5}
                    {...look.figure}
                    caps
                    letterSpacingEm={0.16}
                    color={readableOn(color)}
                    align="center"
                    slot="town"
                />
            )}
        </>
    );
};

const VintageMedia = ({
    w,
    x,
    y,
    boxW,
    boxH,
    rule,
    street,
    photo,
    icon,
    fallbackIcon,
    iconSize,
}: {
    w: number;
    x: number;
    y: number;
    boxW: number;
    boxH: number;
    rule: string;
    street: boolean;
    photo?: PhotoSource;
    icon?: SpaceIconSource;
    fallbackIcon: IconName;
    iconSize: number;
}) => {
    const { theme } = useRender();

    return photo !== undefined ? (
        <>
            <PhotoSlot x={x} y={y} w={boxW} h={boxH} photo={photo} />
            <Frame x={x} y={y} w={boxW} h={boxH} color={rule} strokeMm={0.25} />
        </>
    ) : (
        !street && (
            <SpaceIconArt
                icon={icon}
                fallback={fallbackIcon}
                x={(w - iconSize) / 2}
                y={y + (boxH - iconSize) / 2}
                size={iconSize}
                color={theme.ink}
                strokeWidth={1.3}
            />
        )
    );
};

const VintagePricePlate = ({
    w,
    top,
    h,
    rule,
    price,
}: {
    w: number;
    top: number;
    h: number;
    rule: string;
    price: string;
}) => {
    const { theme } = useRender();
    const look = useBoardLook();

    return (
        <>
            <Cartouche
                x={w * 0.17}
                y={top}
                w={w * 0.66}
                h={h}
                color={rule}
                fill={mix(theme.paper, '#FFFFFF', 0.4)}
            />
            <FitText
                text={price}
                x={w * 0.17 + 1.2}
                y={top + 0.6}
                w={w * 0.66 - 2.4}
                h={h - 1.2}
                maxFontMm={3.2}
                minFontMm={1.8}
                {...look.figure}
                align="center"
                slot="price"
            />
        </>
    );
};
