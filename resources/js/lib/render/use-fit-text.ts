import { useLayoutEffect, useMemo, useState } from 'react';

import { estimateMeasure, fitText, type FitTextResult, type MeasureText, type WrapMode } from './fit-text';

const PX_PER_MM = 96 / 25.4;
const REFERENCE_SIZE_MM = 10;

/**
 * Measures one line in the DOM with a hidden, non-wrapping span at a reference size and
 * scales the width linearly (text width is linear in font size). Falls back to an estimate
 * where there is no layout (server rendering, jsdom-like test environments).
 */
export function createDomMeasure(fontFamily: string, fontWeight: number): MeasureText {
    if (typeof document === 'undefined' || document.body === null) {
        return estimateMeasure;
    }

    const probe = document.createElement('span');

    Object.assign(probe.style, {
        position: 'absolute',
        visibility: 'hidden',
        whiteSpace: 'pre',
        left: '-9999px',
        top: '0',
        fontFamily,
        fontWeight: String(fontWeight),
        fontSize: `${REFERENCE_SIZE_MM}mm`,
        lineHeight: '1',
    });
    document.body.appendChild(probe);

    const cache = new Map<string, number>();

    const measure: MeasureText = (text, fontSizeMm) => {
        let width = cache.get(text);

        if (width === undefined) {
            probe.textContent = text;
            width = probe.getBoundingClientRect().width / PX_PER_MM;
            cache.set(text, width);
        }

        return width === 0 && text !== ''
            ? estimateMeasure(text, fontSizeMm)
            : (width * fontSizeMm) / REFERENCE_SIZE_MM;
    };

    // The probe stays attached for the lifetime of the measure function; callers dispose it.
    return Object.assign(measure, { dispose: () => probe.remove() });
}

export interface UseFitTextOptions {
    text: string;
    widthMm: number;
    heightMm: number;
    maxFontMm: number;
    minFontMm: number;
    wrap?: WrapMode;
    lineHeight?: number;
    fontFamily: string;
    fontWeight: number;
}

/**
 * Fits text to a box. The first render uses an estimate (same on server and client); after
 * layout the result is recomputed from DOM measurements, and again once web fonts are ready.
 */
export function useFitText(options: UseFitTextOptions): FitTextResult {
    const { text, widthMm, heightMm, maxFontMm, minFontMm, wrap, lineHeight, fontFamily, fontWeight } = options;
    const [fontsVersion, setFontsVersion] = useState(0);
    const [measured, setMeasured] = useState<{ key: string; result: FitTextResult } | null>(null);
    const key = JSON.stringify([
        text,
        widthMm,
        heightMm,
        maxFontMm,
        minFontMm,
        wrap,
        lineHeight,
        fontFamily,
        fontWeight,
        fontsVersion,
    ]);

    const estimated = useMemo(
        () => fitText({ text, widthMm, heightMm, maxFontMm, minFontMm, wrap, lineHeight, measure: estimateMeasure }),
        [text, widthMm, heightMm, maxFontMm, minFontMm, wrap, lineHeight],
    );

    useLayoutEffect(() => {
        let alive = true;

        void document.fonts?.ready.then(() => {
            if (alive) {
                setFontsVersion((version) => version + 1);
            }
        });

        return () => {
            alive = false;
        };
    }, []);

    useLayoutEffect(() => {
        const measure = createDomMeasure(fontFamily, fontWeight);
        const result = fitText({ text, widthMm, heightMm, maxFontMm, minFontMm, wrap, lineHeight, measure });

        if ('dispose' in measure && typeof measure.dispose === 'function') {
            measure.dispose();
        }

        setMeasured({ key, result });
    }, [key, text, widthMm, heightMm, maxFontMm, minFontMm, wrap, lineHeight, fontFamily, fontWeight]);

    return measured !== null && measured.key === key ? measured.result : estimated;
}
