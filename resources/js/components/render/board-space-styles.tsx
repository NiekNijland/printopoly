import { mix, readableOn } from '@/lib/render/color';
import type { BoardStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import type { DeckId } from '@/types/game';

import { RULE_INSET, TILE_GAP, ruleColor, useBoardLook } from './board-look';
import { Pill } from './board-look-playful';
import { Cartouche } from './board-look-vintage';
import { FitText } from './fit-text';
import type { IconName } from './icons';
import { Abs, Frame, useRender, BoxSvg } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';

/**
 * The street, station, utility, tax and card spaces in a board style of their own (B268): Vintage, Modern and
 * Speels. The theme's own look stays in board-space.tsx. Each keeps the slots of the theme look (`name`, `price`,
 * `town`, `amount`, `color-bar`), so the checks and the print find the same parts.
 */

export type StyledPropertyProps = {
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
};

export type StyledTaxProps = {
    style: BoardStyle;
    w: number;
    h: number;
    title: string;
    amount: string;
    icon?: SpaceIconSource;
};

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
            <TaxBox
                style={style}
                x={boxX}
                y={boxTop}
                w={boxW}
                h={boxH}
                fullWidth={w}
            />
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

const TaxBox = ({
    style,
    x: boxX,
    y: boxTop,
    w: boxW,
    h: boxH,
    fullWidth: w,
}: {
    style: BoardStyle;
    x: number;
    y: number;
    w: number;
    h: number;
    fullWidth: number;
}) => {
    const { theme } = useRender();

    return (
        <>
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
        </>
    );
};

export type StyledDeckProps = {
    style: BoardStyle;
    deck: DeckId;
    w: number;
    h: number;
    title: string;
    icon?: SpaceIconSource;
};

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
        return (
            <ModernDeck
                w={w}
                h={h}
                title={title}
                icon={icon}
                accent={accent}
                fallback={fallback}
            />
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

const ModernDeck = ({
    w,
    h,
    title,
    icon,
    accent,
    fallback,
}: {
    w: number;
    h: number;
    title: string;
    icon?: SpaceIconSource;
    accent: string;
    fallback: IconName;
}) => {
    const look = useBoardLook();
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
            <BoxSvg
                x={(w - disc) / 2}
                y={discTop}
                w={disc}
                h={disc}
                viewBox="0 0 10 10"
                data-slot="deck-disc"
            >
                <circle cx={5} cy={5} r={5} fill={accent} />
            </BoxSvg>
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
};
