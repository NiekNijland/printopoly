import { useEffect, type CSSProperties } from 'react';

import type { WrapMode } from '@/lib/render/fit-text';
import type { FitTextResult } from '@/lib/render/fit-text';
import { mm } from '@/lib/render/units';
import { useFitText } from '@/lib/render/use-fit-text';

import { useRender } from './sheet';

type FontRole = 'heading' | 'body' | 'mono';

export interface FitTextProps {
    text: string;
    x: number;
    y: number;
    w: number;
    h: number;
    maxFontMm: number;
    minFontMm: number;
    /** `none` keeps the lines as typed, `words` wraps at spaces. Default `none`. */
    wrap?: WrapMode;
    font?: FontRole;
    /** Overrides the weight of the font role. */
    weight?: number;
    color?: string;
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
    lineHeight?: number;
    /** Italic letters, for a quote such as the story on a deed (B169). */
    italic?: boolean;
    /** Called when the fit result changes, for the check step (B94). */
    onFit?: (result: FitTextResult) => void;
    /** Marks the text for tests and for the check step. */
    slot?: string;
}

const JUSTIFY = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
} as const;
const ALIGN = {
    top: 'flex-start',
    middle: 'center',
    bottom: 'flex-end',
} as const;

/**
 * Text in a box that shrinks to fit (B55). It never hyphenates, and `data-fits` and
 * `data-overflow-chars` tell the check step whether the text fits at the minimum size.
 */
export function FitText({
    text,
    x,
    y,
    w,
    h,
    maxFontMm,
    minFontMm,
    wrap = 'none',
    font = 'body',
    weight,
    color,
    align = 'left',
    valign = 'middle',
    lineHeight = 1.2,
    italic = false,
    onFit,
    slot,
}: FitTextProps) {
    const { theme } = useRender();
    const family =
        font === 'heading'
            ? theme.headingFont
            : font === 'mono'
              ? theme.monoFont
              : theme.bodyFont;
    const fontWeight =
        weight ??
        (font === 'heading'
            ? theme.headingWeight
            : font === 'mono'
              ? 400
              : 400);
    const result = useFitText({
        text,
        widthMm: w,
        heightMm: h,
        maxFontMm,
        minFontMm,
        wrap,
        lineHeight,
        fontFamily: family,
        fontWeight,
    });

    useEffect(() => {
        onFit?.(result);
        // Only the outcome matters to the caller, not the identity of the result object.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result.fits, result.overflowChars, result.fontSizeMm]);

    const box: CSSProperties = {
        position: 'absolute',
        left: mm(x),
        top: mm(y),
        width: mm(w),
        height: mm(h),
        display: 'flex',
        justifyContent: JUSTIFY[align],
        alignItems: ALIGN[valign],
    };
    const inner: CSSProperties = {
        width: mm(result.availableWidthMm),
        fontFamily: family,
        fontWeight,
        fontSize: mm(result.fontSizeMm),
        lineHeight,
        color,
        fontStyle: italic ? 'italic' : undefined,
        textAlign: align,
        whiteSpace: wrap === 'none' ? 'pre' : 'pre-line',
        hyphens: 'none',
        overflowWrap: 'normal',
        wordBreak: 'normal',
        textTransform: font === 'heading' ? theme.headingTransform : undefined,
    };

    return (
        <div
            style={box}
            data-slot={slot}
            data-fits={String(result.fits)}
            data-overflow-chars={result.overflowChars}
            data-font-size-mm={result.fontSizeMm}
        >
            <div style={inner}>{text}</div>
        </div>
    );
}
