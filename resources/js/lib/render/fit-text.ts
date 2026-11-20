/**
 * Text fitting (B55). Text shrinks until it fits a box with a 3% margin. Two modes:
 * `none` keeps every line as typed (names, one line), `words` wraps at spaces (card text)
 * and never hyphenates. The 3% margin makes browsers with slightly different font metrics
 * break lines at the same place as Chromium does in the PDF.
 *
 * Measuring is injected so the logic stays pure and testable.
 */

/** Width in mm of one line of text at the given font size. */
export type MeasureText = (text: string, fontSizeMm: number) => number;

export type WrapMode = 'none' | 'words';

/** Share of the box that stays empty: the text gets 97% of the width and height. */
export const FIT_MARGIN = 0.03;

export interface FitTextOptions {
    text: string;
    widthMm: number;
    heightMm: number;
    maxFontMm: number;
    minFontMm: number;
    wrap?: WrapMode;
    /** Line height as a multiple of the font size. */
    lineHeight?: number;
    measure: MeasureText;
}

export interface FitTextResult {
    fontSizeMm: number;
    /** False when the text does not fit even at the minimum font size. */
    fits: boolean;
    /** Characters to remove (from the end) before the text fits at the minimum size. 0 when it fits. */
    overflowChars: number;
    /** The lines as they are laid out at `fontSizeMm`. */
    lines: string[];
    availableWidthMm: number;
    availableHeightMm: number;
}

const ITERATIONS = 24;

export function wrapLines(
    text: string,
    maxWidthMm: number,
    fontSizeMm: number,
    measure: MeasureText,
    wrap: WrapMode,
): string[] {
    const paragraphs = text.split('\n');

    if (wrap === 'none') {
        return paragraphs;
    }

    const lines: string[] = [];

    for (const paragraph of paragraphs) {
        let current = '';

        for (const word of paragraph.split(' ').filter((part) => part !== '')) {
            const candidate = current === '' ? word : `${current} ${word}`;

            if (
                current === '' ||
                measure(candidate, fontSizeMm) <= maxWidthMm
            ) {
                current = candidate;
            } else {
                lines.push(current);
                current = word;
            }
        }

        lines.push(current);
    }

    return lines;
}

export function fitText(options: FitTextOptions): FitTextResult {
    const { text, widthMm, heightMm, maxFontMm, minFontMm, measure } = options;
    const wrap = options.wrap ?? 'none';
    const lineHeight = options.lineHeight ?? 1.2;
    const availableWidthMm = widthMm * (1 - FIT_MARGIN);
    const availableHeightMm = heightMm * (1 - FIT_MARGIN);

    const layout = (value: string, size: number) => {
        const lines = wrapLines(value, availableWidthMm, size, measure, wrap);
        const width = Math.max(0, ...lines.map((line) => measure(line, size)));
        const height = lines.length * size * lineHeight;

        return {
            lines,
            fits: width <= availableWidthMm && height <= availableHeightMm,
        };
    };

    const result = (
        fontSizeMm: number,
        fits: boolean,
        overflowChars: number,
        lines: string[],
    ): FitTextResult => ({
        fontSizeMm,
        fits,
        overflowChars,
        lines,
        availableWidthMm,
        availableHeightMm,
    });

    if (text.trim() === '') {
        return result(maxFontMm, true, 0, []);
    }

    const atMax = layout(text, maxFontMm);

    if (atMax.fits) {
        return result(maxFontMm, true, 0, atMax.lines);
    }

    const atMin = layout(text, minFontMm);

    if (!atMin.fits) {
        let low = 0;
        let high = text.length;

        while (low < high) {
            const middle = Math.ceil((low + high) / 2);

            if (layout(text.slice(0, middle), minFontMm).fits) {
                low = middle;
            } else {
                high = middle - 1;
            }
        }

        return result(minFontMm, false, text.length - low, atMin.lines);
    }

    let low = minFontMm;
    let high = maxFontMm;

    for (let i = 0; i < ITERATIONS; i++) {
        const middle = (low + high) / 2;

        if (layout(text, middle).fits) {
            low = middle;
        } else {
            high = middle;
        }
    }

    const size = Math.max(minFontMm, Math.floor(low * 100) / 100);

    return result(size, true, 0, layout(text, size).lines);
}

/** Rough width estimate used on the server and where no DOM is available: 0.55 em per character. */
export const estimateMeasure: MeasureText = (text, fontSizeMm) =>
    text.length * fontSizeMm * 0.55;
