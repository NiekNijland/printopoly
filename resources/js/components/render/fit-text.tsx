import { useEffect, type CSSProperties } from 'react';

import type { WrapMode } from '@/lib/render/fit-text';
import type { FitTextResult } from '@/lib/render/fit-text';
import { mm } from '@/lib/render/units';
import { useFitText } from '@/lib/render/use-fit-text';

import { useRender } from './sheet';

/** `title` is the big name of the edition (the plate and the lid): a script in Gala, the heading elsewhere. */
type FontRole = 'heading' | 'title' | 'body' | 'mono';

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
    /**
     * A font family of its own instead of the one of the role, such as the script of a title style (Niek, 22 nov).
     * The text is then drawn as given: no heading case of the theme.
     */
    family?: string;
    /** Overrides the weight of the font role. */
    weight?: number;
    color?: string;
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
    lineHeight?: number;
    /** Italic letters, for a quote such as the story on a deed (B169). */
    italic?: boolean;
    /** Capitals, measured as capitals; the text itself stays as typed. */
    caps?: boolean;
    /** Extra room between letters in em, for a small line in capitals. */
    letterSpacingEm?: number;
    /** Called when the fit result changes, for the check step (B94). */
    onFit?: (result: FitTextResult) => void;
    /** Marks the text for tests and for the check step. */
    slot?: string;
    /**
     * Cuts off what does not fit at the smallest size, so a name never runs over the edge of its band or page
     * (bug 14 of test round 3). Controle says so before it is printed.
     */
    clip?: boolean;
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
    family: ownFamily,
    weight,
    color,
    align = 'left',
    valign = 'middle',
    lineHeight = 1.2,
    italic = false,
    caps = false,
    letterSpacingEm = 0,
    onFit,
    slot,
    clip = false,
}: FitTextProps) {
    const { theme } = useRender();
    const family =
        ownFamily ??
        (font === 'heading'
            ? theme.headingFont
            : font === 'title'
              ? theme.titleFont
              : font === 'mono'
                ? theme.monoFont
                : theme.bodyFont);
    const fontWeight =
        weight ??
        (font === 'heading'
            ? theme.headingWeight
            : font === 'title'
              ? theme.titleWeight
              : 400);
    const result = useFitText({
        text: caps ? text.toLocaleUpperCase() : text,
        widthMm: w,
        heightMm: h,
        maxFontMm,
        minFontMm,
        wrap,
        lineHeight,
        fontFamily: family,
        fontWeight,
        letterSpacingEm,
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
        overflow: clip ? 'hidden' : undefined,
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
        letterSpacing:
            letterSpacingEm === 0 ? undefined : `${letterSpacingEm}em`,
        textTransform: caps
            ? 'uppercase'
            : ownFamily === undefined &&
                (font === 'heading' || font === 'title')
              ? theme.headingTransform
              : undefined,
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
