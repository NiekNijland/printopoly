import {
    createContext,
    useContext,
    type CSSProperties,
    type ReactNode,
} from 'react';

import { defaultCurrency } from '@/lib/render/game-currency';
import type { RenderStyle } from '@/lib/render/style';
import { THEMES, type Theme, type ThemeId } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import { money as formatMoney, type RenderWords } from '@/lib/render/words';
import type { CurrencyId, Locale } from '@/types/game';

/** Props every element renderer takes: resolved theme and language, plus bleed for print. */
export type ElementProps = {
    theme: ThemeId;
    locale: Locale;
    /** Currency of the edition; defaults to euros in Dutch and play money (M) in English. */
    currency?: CurrencyId;
    /** The edition's own words (houses, hotels, decks, currency); without them the standard words print. */
    words?: RenderWords;
    /** Extra paper around the trim size in mm (3 for printer cards, 0 for money). */
    bleedMm?: number;
    className?: string;
    /** What the edition changes on top of its theme: the group colours (B130). */
    style?: RenderStyle;
};

type RenderContextValue = {
    theme: Theme;
    locale: Locale;
    currency: CurrencyId;
    words: RenderWords;
    /** An amount in the currency of the edition: `€ 1.500`, or `RP 1.500` with its own symbol. */
    money: (amount: number) => string;
    style?: RenderStyle;
};

const RenderContext = createContext<RenderContextValue>({
    theme: THEMES.classic,
    locale: 'nl',
    currency: 'eur',
    words: {},
    money: (amount) => formatMoney(amount, 'eur', 'nl'),
});

export const useRender = (): RenderContextValue => {
    return useContext(RenderContext);
};

type SheetProps = {
    /** Name of the element, exposed as `data-element` for tests and the print pages. */
    element: string;
    /** Trim size in mm. */
    widthMm: number;
    heightMm: number;
    background: string;
    /** Round the corners like a playing card (only without bleed; the printer cuts the corners). */
    rounded?: boolean;
    /** Drawn over the whole sheet including the bleed, below the content (full-bleed photos). */
    underlay?: ReactNode;
    children?: ReactNode;
} & ElementProps;

/**
 * The outer box of an element: trim size plus bleed on every side. Content is positioned
 * in mm relative to the trim box, so it is the same with and without bleed.
 */
export const Sheet = ({
    element,
    theme,
    locale,
    currency,
    words,
    style,
    bleedMm = 0,
    className,
    widthMm,
    heightMm,
    background,
    rounded = false,
    underlay,
    children,
}: SheetProps) => {
    const resolved = THEMES[theme];
    const radius = rounded && bleedMm === 0 ? resolved.cardRadiusMm : 0;
    const outer: CSSProperties = {
        position: 'relative',
        boxSizing: 'border-box',
        width: mm(widthMm + 2 * bleedMm),
        height: mm(heightMm + 2 * bleedMm),
        background,
        borderRadius: mm(radius),
        overflow: 'hidden',
        color: resolved.ink,
        fontFamily: resolved.bodyFont,
        lineHeight: 1.2,
    };
    const trim: CSSProperties = {
        position: 'absolute',
        left: mm(bleedMm),
        top: mm(bleedMm),
        width: mm(widthMm),
        height: mm(heightMm),
    };

    return (
        <RenderContext.Provider
            value={{
                theme: resolved,
                locale,
                currency: currency ?? defaultCurrency(locale),
                words: words ?? {},
                money: (amount) =>
                    formatMoney(
                        amount,
                        currency ?? defaultCurrency(locale),
                        locale,
                        words,
                    ),
                ...(style === undefined ? {} : { style }),
            }}
        >
            <div
                className={className}
                style={outer}
                data-element={element}
                data-theme={theme}
                data-width-mm={widthMm}
                data-height-mm={heightMm}
                data-bleed-mm={bleedMm}
            >
                {underlay !== undefined && (
                    <div style={{ position: 'absolute', inset: 0 }}>
                        {underlay}
                    </div>
                )}
                <div style={trim} data-trim="">
                    {children}
                </div>
            </div>
        </RenderContext.Provider>
    );
};

/** Absolutely positioned box in mm. */
export const Abs = ({
    x,
    y,
    w,
    h,
    style,
    slot,
    children,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    style?: CSSProperties;
    slot?: string;
    children?: ReactNode;
}) => {
    return (
        <div
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: mm(w),
                height: mm(h),
                ...style,
            }}
            data-slot={slot}
        >
            {children}
        </div>
    );
};

/**
 * Outline rectangle drawn as inline SVG; the stroke sits inside the given box. An `ornate` frame (the frame of a
 * card, deed, lid or booklet page) gets the thin second line of a theme with an ornament (Gala, B247).
 */
export const Frame = ({
    x,
    y,
    w,
    h,
    color,
    strokeMm,
    radiusMm = 0,
    fill = 'none',
    ornate = false,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    strokeMm: number;
    radiusMm?: number;
    fill?: string;
    ornate?: boolean;
}) => {
    const { theme } = useRender();
    const ornament = ornate ? theme.ornament : undefined;
    const inset =
        ornament === undefined
            ? 0
            : strokeMm + ornament.gapMm + ornament.strokeMm / 2;

    return (
        <svg
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: mm(w),
                height: mm(h),
                overflow: 'visible',
            }}
            viewBox={`0 0 ${w} ${h}`}
            aria-hidden="true"
            data-frame=""
        >
            <rect
                x={strokeMm / 2}
                y={strokeMm / 2}
                width={w - strokeMm}
                height={h - strokeMm}
                rx={radiusMm}
                fill={fill}
                stroke={color}
                strokeWidth={strokeMm}
            />
            {ornament !== undefined && (
                <rect
                    x={inset}
                    y={inset}
                    width={Math.max(0, w - 2 * inset)}
                    height={Math.max(0, h - 2 * inset)}
                    rx={Math.max(0, radiusMm - inset)}
                    fill="none"
                    stroke={ornament.color}
                    strokeWidth={ornament.strokeMm}
                    data-ornament=""
                />
            )}
        </svg>
    );
};
