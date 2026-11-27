import { describe, expect, it } from 'vitest';

import { fitText, type MeasureText } from './fit-text';

/** Every character is half an em wide, so widths are easy to calculate by hand. */
const measure: MeasureText = (text, size) => text.length * size * 0.5;

const base = {
    widthMm: 100,
    heightMm: 20,
    maxFontMm: 10,
    minFontMm: 2,
    lineHeight: 1,
    measure,
};

describe('fitText', () => {
    it('keeps the maximum size when the text fits', () => {
        const result = fitText({ ...base, text: 'Kans' });

        expect(result).toMatchObject({
            fontSizeMm: 10,
            fits: true,
            overflowChars: 0,
            lines: ['Kans'],
        });
    });

    it('leaves a 3% margin on width and height', () => {
        const result = fitText({ ...base, text: 'x' });

        expect(result.availableWidthMm).toBeCloseTo(97);
        expect(result.availableHeightMm).toBeCloseTo(19.4);
    });

    it('shrinks a long line until it fits the width', () => {
        // 40 characters at 0.5 em: width 20 * size, so at most 97 / 20 = 4.85 mm.
        const result = fitText({ ...base, text: 'a'.repeat(40) });

        expect(result.fits).toBe(true);
        expect(result.fontSizeMm).toBeLessThanOrEqual(4.85);
        expect(result.fontSizeMm).toBeGreaterThan(4.8);
        expect(measure('a'.repeat(40), result.fontSizeMm)).toBeLessThanOrEqual(
            97,
        );
    });

    it('does not wrap in none mode, only at typed line breaks', () => {
        const result = fitText({ ...base, text: 'Jans\nBierkelder' });

        expect(result.lines).toEqual(['Jans', 'Bierkelder']);
    });

    it('reports a text that does not fit at the minimum size, with the number of characters too many', () => {
        // At 2 mm a character is 1 mm wide, so 97 characters fit.
        const result = fitText({ ...base, text: 'a'.repeat(120) });

        expect(result.fits).toBe(false);
        expect(result.fontSizeMm).toBe(2);
        expect(result.overflowChars).toBe(23);
    });

    it('never goes below the minimum size', () => {
        const result = fitText({
            ...base,
            text: 'a'.repeat(500),
            minFontMm: 3,
        });

        expect(result.fontSizeMm).toBe(3);
        expect(result.fits).toBe(false);
    });

    it('wraps at spaces in words mode and fits the height', () => {
        const text =
            'Ga naar het dichtstbijzijnde station en ontvang geld van de bank';
        const result = fitText({
            text,
            widthMm: 40,
            heightMm: 30,
            maxFontMm: 6,
            minFontMm: 2,
            lineHeight: 1.2,
            wrap: 'words',
            measure,
        });

        expect(result.fits).toBe(true);
        expect(result.lines.length).toBeGreaterThan(1);
        expect(result.lines.join(' ')).toBe(text);
        expect(
            result.lines.length * result.fontSizeMm * 1.2,
        ).toBeLessThanOrEqual(29.1);

        for (const line of result.lines) {
            expect(measure(line, result.fontSizeMm)).toBeLessThanOrEqual(38.8);
        }
    });

    it('counts overflow in words mode against the height', () => {
        const text = 'woord '.repeat(80).trim();
        const options = {
            widthMm: 30,
            heightMm: 20,
            maxFontMm: 4,
            minFontMm: 2,
            lineHeight: 1.2,
            wrap: 'words' as const,
            measure,
        };
        const result = fitText({ text, ...options });

        expect(result.fits).toBe(false);
        expect(result.overflowChars).toBeGreaterThan(0);
        expect(result.overflowChars).toBeLessThan(text.length);
        expect(
            fitText({
                text: text.slice(0, text.length - result.overflowChars),
                ...options,
            }).fits,
        ).toBe(true);
    });

    it('treats empty text as fitting', () => {
        expect(fitText({ ...base, text: '  ' })).toMatchObject({
            fits: true,
            overflowChars: 0,
            lines: [],
        });
    });
});

const wrapLines = (text: string, availableWidthMm: number): string[] =>
    fitText({
        text,
        widthMm: availableWidthMm / 0.97,
        heightMm: 100,
        maxFontMm: 1,
        minFontMm: 1,
        wrap: 'words',
        measure,
    }).lines;

describe('wrapping at words', () => {
    it('puts a word that is too wide on its own line without breaking it', () => {
        expect(wrapLines('a bbbbbbbbbbbb c', 4)).toEqual([
            'a',
            'bbbbbbbbbbbb',
            'c',
        ]);
    });

    it('keeps explicit line breaks in words mode', () => {
        expect(wrapLines('een\ntwee drie', 100)).toEqual(['een', 'twee drie']);
    });
});
