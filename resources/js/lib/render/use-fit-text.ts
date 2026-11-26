import { useMemo, useSyncExternalStore } from 'react';

import {
    estimateMeasure,
    fitText,
    type FitTextResult,
    type MeasureText,
    type WrapMode,
} from './fit-text';

type DomMeasure = MeasureText & { dispose?: () => void };

const PX_PER_MM = 96 / 25.4;
const REFERENCE_SIZE_MM = 10;

/**
 * Measures one line in the DOM with a hidden, non-wrapping span at a reference size and
 * scales the width linearly (text width is linear in font size). Falls back to an estimate
 * where there is no layout (server rendering, jsdom-like test environments).
 */
function createDomMeasure(fontFamily: string, fontWeight: number): DomMeasure {
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
    /** Extra room between letters, in em; every letter is that much wider. */
    letterSpacingEm?: number;
}

/**
 * Counts how often web fonts finished loading, so text is measured again then. The server
 * snapshot is -1: server rendering and hydration use the estimate, the first client render
 * after that measures in the DOM.
 *
 * A font face only loads when something first uses it, which can be after `fonts.ready` has
 * settled (a heading font that the phone layout only needs for the hidden Controle probe). So
 * every finished load counts, not only the first.
 */
let fontsVersion = 0;
const fontListeners = new Set<() => void>();
let watchingFonts = false;

function fontsLoaded(): void {
    fontsVersion += 1;
    fontListeners.forEach((notify) => notify());
}

function subscribeFonts(listener: () => void): () => void {
    fontListeners.add(listener);

    if (!watchingFonts && typeof document !== 'undefined') {
        watchingFonts = true;
        void document.fonts?.ready.then(fontsLoaded);
        document.fonts?.addEventListener?.('loadingdone', fontsLoaded);
    }

    return () => {
        fontListeners.delete(listener);
    };
}

const getFontsVersion = () => fontsVersion;
const getServerFontsVersion = () => -1;

/**
 * Fits text to a box. Server rendering and hydration use an estimate; on the client the
 * result comes from DOM measurements, and again once web fonts are ready.
 */
export function useFitText(options: UseFitTextOptions): FitTextResult {
    const {
        text,
        widthMm,
        heightMm,
        maxFontMm,
        minFontMm,
        wrap,
        lineHeight,
        fontFamily,
        fontWeight,
        letterSpacingEm = 0,
    } = options;
    const fonts = useSyncExternalStore(
        subscribeFonts,
        getFontsVersion,
        getServerFontsVersion,
    );

    return useMemo(() => {
        const measure: DomMeasure =
            fonts < 0
                ? estimateMeasure
                : createDomMeasure(fontFamily, fontWeight);
        const spaced: MeasureText =
            letterSpacingEm === 0
                ? measure
                : (line, fontSizeMm) =>
                      measure(line, fontSizeMm) +
                      line.length * letterSpacingEm * fontSizeMm;
        const result = fitText({
            text,
            widthMm,
            heightMm,
            maxFontMm,
            minFontMm,
            wrap,
            lineHeight,
            measure: spaced,
        });

        measure.dispose?.();

        return result;
    }, [
        letterSpacingEm,
        fonts,
        text,
        widthMm,
        heightMm,
        maxFontMm,
        minFontMm,
        wrap,
        lineHeight,
        fontFamily,
        fontWeight,
    ]);
}

/**
 * Like `useFitText`, and also the width in mm of the widest line at the fitted size, for things that
 * wrap around text (the plate under the edition title, B125).
 */
export function useFitTextWidth(options: UseFitTextOptions): {
    result: FitTextResult;
    widthMm: number;
} {
    const {
        text,
        widthMm,
        heightMm,
        maxFontMm,
        minFontMm,
        wrap,
        lineHeight,
        fontFamily,
        fontWeight,
    } = options;
    const fonts = useSyncExternalStore(
        subscribeFonts,
        getFontsVersion,
        getServerFontsVersion,
    );

    return useMemo(() => {
        const measure: DomMeasure =
            fonts < 0
                ? estimateMeasure
                : createDomMeasure(fontFamily, fontWeight);
        const result = fitText({
            text,
            widthMm,
            heightMm,
            maxFontMm,
            minFontMm,
            wrap,
            lineHeight,
            measure,
        });
        const width = Math.max(
            0,
            ...result.lines.map((line) => measure(line, result.fontSizeMm)),
        );

        measure.dispose?.();

        return { result, widthMm: width };
    }, [
        fonts,
        text,
        widthMm,
        heightMm,
        maxFontMm,
        minFontMm,
        wrap,
        lineHeight,
        fontFamily,
        fontWeight,
    ]);
}
