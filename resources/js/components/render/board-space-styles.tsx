import { mix, readableOn } from '@/lib/render/color';
import type { BoardStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';
import type { DeckId } from '@/types/game';

import {
    AwningBand,
    Cartouche,
    Hatch,
    Pill,
    RULE_INSET,
    TILE_GAP,
    ruleColor,
    useBoardLook,
} from './board-look';
import { FitText } from './fit-text';
import type { IconName } from './icons';
import { PhotoSlot } from './photo-slot';
import { Abs, Frame, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

/**
 * The street, station, utility, tax and card spaces in a board style of their own (B268): Vintage, Modern and
 * Speels. The theme's own look stays in board-space.tsx. Each keeps the slots of the theme look (`name`, `price`,
 * `town`, `amount`, `color-bar`), so the checks and the print find the same parts.
 */

export interface StyledPropertyProps {
    style: BoardStyle;
    w: number;
    h: number;
    /** Streets have a colour band; stations and utilities do not. */
    street: boolean;
    title: string;
    town?: string;
    price: string;
    /** The colour of the group of a street. */
    color: string;
    photo?: PhotoSource;
    icon?: SpaceIconSource;
    fallbackIcon: IconName;
}

/** A street, station or utility with a framed photo or none. */
export const StyledProperty = (props: StyledPropertyProps) => {
    switch (props.style) {
        case 'vintage':
            return <VintageProperty {...props} />;
        case 'modern':
            return <ModernProperty {...props} />;
        case 'playful':
            return <PlayfulProperty {...props} />;
    }
};

const VintageProperty = ({
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
                <>
                    <Abs
                        x={bandX}
                        y={bandTop}
                        w={bandW}
                        h={bar}
                        style={{ background: color }}
                        slot="color-bar"
                    />
                    <Hatch
                        x={bandX}
                        y={bandTop}
                        w={bandW}
                        h={bar}
                        color={
                            readableOn(color) === '#FFFFFF'
                                ? mix(color, '#FFFFFF', 0.5)
                                : mix(color, theme.ink, 0.6)
                        }
                        opacity={0.5}
                        strokeMm={0.12}
                    />
                    <Abs
                        x={bandX}
                        y={bandTop + bar}
                        w={bandW}
                        h={0.32}
                        style={{ background: rule }}
                        slot="band-rule"
                    />
                    <Abs
                        x={bandX}
                        y={bandTop + bar + 0.7}
                        w={bandW}
                        h={0.12}
                        style={{ background: rule }}
                    />
                    {town !== undefined && town !== '' && (
                        <FitText
                            text={town}
                            x={bandX + 1}
                            y={bandTop}
                            w={bandW - 2}
                            h={bar}
                            maxFontMm={Math.min(2.4, bar * 0.2)}
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
            {framed ? (
                <>
                    <PhotoSlot
                        x={bandX}
                        y={mediaTop}
                        w={bandW}
                        h={mediaHeight}
                        photo={photo}
                    />
                    <Frame
                        x={bandX}
                        y={mediaTop}
                        w={bandW}
                        h={mediaHeight}
                        color={rule}
                        strokeMm={0.25}
                    />
                </>
            ) : (
                !street && (
                    <SpaceIconArt
                        icon={icon}
                        fallback={fallbackIcon}
                        x={(w - iconSize) / 2}
                        y={mediaTop + (mediaHeight - iconSize) / 2}
                        size={iconSize}
                        color={theme.ink}
                        strokeWidth={1.3}
                    />
                )
            )}
            <Cartouche
                x={w * 0.17}
                y={plateTop}
                w={w * 0.66}
                h={plateH}
                color={rule}
                fill={mix(theme.paper, '#FFFFFF', 0.4)}
            />
            <FitText
                text={price}
                x={w * 0.17 + 1.2}
                y={plateTop + 0.6}
                w={w * 0.66 - 2.4}
                h={plateH - 1.2}
                maxFontMm={3.2}
                minFontMm={1.8}
                {...look.figure}
                align="center"
                slot="price"
            />
        </>
    );
};

const ModernProperty = ({
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
    const text = readableOn(block);
    const bar = h * 0.36;
    const hasTown = town !== undefined && town !== '';
    const framed = photo !== undefined;
    const priceTop = h - 8.6;
    const mediaTop = bar + 2;
    const mediaHeight = priceTop - 1.6 - mediaTop;
    const iconSize = Math.min(w - 10, mediaHeight, 26);

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

const PlayfulProperty = ({
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
    const hasTown = town !== undefined && town !== '';

    return (
        <>
            {street && (
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
            {framed ? (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                    }}
                >
                    <PhotoSlot
                        x={edge}
                        y={mediaTop}
                        w={w - 2 * edge}
                        h={mediaHeight}
                        photo={photo}
                    />
                    <Frame
                        x={edge}
                        y={mediaTop}
                        w={w - 2 * edge}
                        h={mediaHeight}
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
                        y={mediaTop + (mediaHeight - iconSize) / 2}
                        size={iconSize}
                        color={theme.ink}
                        strokeWidth={1.8}
                    />
                )
            )}
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

export interface StyledTaxProps {
    style: BoardStyle;
    w: number;
    h: number;
    title: string;
    amount: string;
    icon?: SpaceIconSource;
}

/** A tax space: the name and the amount to pay, in the shape of the style. */
export const StyledTax = ({
    style,
    w,
    h,
    title,
    amount,
    icon,
}: StyledTaxProps) => {
    const { theme } = useRender();
    const look = useBoardLook();
    const inset =
        style === 'modern'
            ? 2.2
            : style === 'vintage'
              ? RULE_INSET + 1.5
              : TILE_GAP + 1.4;
    const nameTop = inset + 1.6;
    const nameH = h * 0.3 - nameTop + 2;
    const boxTop = h * 0.38;
    const boxW = w - 2 * inset - (style === 'modern' ? 0 : 1);
    const boxX = (w - boxW) / 2;
    const boxH = Math.min(style === 'modern' ? 14 : 15, h * 0.24);
    const iconTop = boxTop + boxH + 2.5;
    const iconSize = Math.max(0, Math.min(w - 14, 15, h - iconTop - inset - 2));
    const amountColor = style === 'modern' ? theme.paper : theme.ink;

    return (
        <>
            <FitText
                text={title}
                x={inset}
                y={nameTop}
                w={w - 2 * inset}
                h={nameH}
                maxFontMm={style === 'modern' ? 4.8 : 4}
                minFontMm={2}
                wrap="words"
                {...look.name}
                lineHeight={1.02}
                align={style === 'modern' ? 'left' : 'center'}
                valign={style === 'modern' ? 'bottom' : 'middle'}
                slot="name"
            />
            {style === 'vintage' && (
                <Cartouche
                    x={boxX}
                    y={boxTop}
                    w={boxW}
                    h={boxH}
                    color={ruleColor(theme)}
                    fill={mix(theme.paper, '#FFFFFF', 0.4)}
                />
            )}
            {style === 'modern' && (
                <Abs
                    x={0}
                    y={boxTop}
                    w={w}
                    h={boxH}
                    style={{ background: theme.ink }}
                    slot="amount-block"
                />
            )}
            {style === 'playful' && (
                <Pill
                    x={boxX}
                    y={boxTop}
                    w={boxW}
                    h={boxH}
                    fill={mix(theme.paper, theme.secondaryAccent, 0.14)}
                    ink={theme.ink}
                    dashed
                />
            )}
            <FitText
                text={amount}
                x={boxX + boxW * 0.1}
                y={boxTop + 1.3}
                w={boxW * 0.8}
                h={boxH - 2.6}
                maxFontMm={style === 'modern' ? 3.8 : 3.4}
                minFontMm={1.9}
                wrap="words"
                {...look.figure}
                color={amountColor}
                lineHeight={1.08}
                align="center"
                slot="amount"
            />
            {icon !== undefined && (
                <SpaceIconArt
                    icon={icon}
                    fallback={null}
                    x={(w - iconSize) / 2}
                    y={iconTop}
                    size={iconSize}
                    color={theme.ink}
                    strokeWidth={1.5}
                />
            )}
        </>
    );
};

export interface StyledDeckProps {
    style: BoardStyle;
    deck: DeckId;
    w: number;
    h: number;
    title: string;
    icon?: SpaceIconSource;
}

/** A Chance or Community Chest space: the name and the sign of the deck, in the shape of the style. */
export const StyledDeck = ({
    style,
    deck,
    w,
    h,
    title,
    icon,
}: StyledDeckProps) => {
    const { theme } = useRender();
    const look = useBoardLook();
    const accent = theme.deckAccent[deck];
    const fallback = deck === 'chance' ? 'dice' : 'chest';

    if (style === 'modern') {
        const disc = Math.min(w - 12, h * 0.4);
        const discTop = h - 5 - disc;

        return (
            <>
                <FitText
                    text={title}
                    x={2.2}
                    y={2.6}
                    w={w - 4.4}
                    h={discTop - 4.2}
                    maxFontMm={5}
                    minFontMm={2}
                    wrap="words"
                    {...look.name}
                    lineHeight={0.98}
                    align="left"
                    valign="top"
                    slot="name"
                />
                <svg
                    style={{
                        position: 'absolute',
                        left: mm((w - disc) / 2),
                        top: mm(discTop),
                        width: mm(disc),
                        height: mm(disc),
                    }}
                    viewBox="0 0 10 10"
                    aria-hidden="true"
                    data-slot="deck-disc"
                >
                    <circle cx={5} cy={5} r={5} fill={accent} />
                </svg>
                <SpaceIconArt
                    icon={icon}
                    fallback={fallback}
                    x={(w - disc * 0.56) / 2}
                    y={discTop + disc * 0.22}
                    size={disc * 0.56}
                    color={readableOn(accent)}
                    strokeWidth={2}
                />
            </>
        );
    }

    const inset = style === 'vintage' ? RULE_INSET + 1.5 : TILE_GAP + 1.4;
    const iconSize = Math.min(w - 12, h * 0.38, 24);

    return (
        <>
            {style === 'playful' && (
                <Frame
                    x={TILE_GAP + 1.3}
                    y={TILE_GAP + 1.3}
                    w={w - 2 * (TILE_GAP + 1.3)}
                    h={h - 2 * (TILE_GAP + 1.3)}
                    color={accent}
                    strokeMm={0.45}
                    radiusMm={1.8}
                />
            )}
            <FitText
                text={title}
                x={inset}
                y={inset + 2}
                w={w - 2 * inset}
                h={12}
                maxFontMm={style === 'playful' ? 4.4 : 3.8}
                minFontMm={2}
                wrap="words"
                {...look.name}
                lineHeight={1.04}
                align="center"
                slot="name"
            />
            {style === 'vintage' && (
                <Abs
                    x={w * 0.3}
                    y={inset + 15}
                    w={w * 0.4}
                    h={0.15}
                    style={{ background: ruleColor(theme) }}
                />
            )}
            <SpaceIconArt
                icon={icon}
                fallback={fallback}
                x={(w - iconSize) / 2}
                y={17 + (h - 21 - iconSize) / 2}
                size={iconSize}
                color={accent}
                strokeWidth={style === 'playful' ? 1.8 : 1.3}
            />
        </>
    );
};
