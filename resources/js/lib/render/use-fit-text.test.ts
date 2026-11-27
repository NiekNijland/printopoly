import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
    useFitText,
    useFitTextWidth,
    type UseFitTextOptions,
} from './use-fit-text';

const PX_PER_MM = 96 / 25.4;

const fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() });

let mmPerCharAt10 = 5;

const measureWith = (ratio: number) => {
    mmPerCharAt10 = ratio;
};

beforeAll(() => {
    Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: fonts,
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

const stubLayout = () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
        function measureProbe(this: HTMLElement) {
            return DOMRect.fromRect({
                width: this.textContent.length * mmPerCharAt10 * PX_PER_MM,
                height: 10,
            });
        },
    );
};

const options = (
    overrides: Partial<UseFitTextOptions> = {},
): UseFitTextOptions => ({
    text: 'abcdefghij',
    widthMm: 20,
    heightMm: 10,
    maxFontMm: 10,
    minFontMm: 1,
    fontFamily: 'Inter',
    fontWeight: 400,
    ...overrides,
});

describe('useFitText', () => {
    it('falls back to the estimate where the DOM has no layout', () => {
        const { result } = renderHook(() => useFitText(options()));

        expect(result.current.fits).toBe(true);
        expect(result.current.fontSizeMm).toBeCloseTo(3.52, 1);
    });

    it('measures in the DOM and leaves no probe behind', () => {
        stubLayout();
        measureWith(5);
        const { result } = renderHook(() => useFitText(options()));

        expect(result.current.fontSizeMm).toBeCloseTo(3.88, 1);
        expect(document.body.querySelectorAll('span')).toHaveLength(0);
    });

    it('makes every letter wider with letter spacing', () => {
        stubLayout();
        measureWith(5);
        const { result } = renderHook(() =>
            useFitText(options({ letterSpacingEm: 0.5 })),
        );

        expect(result.current.fontSizeMm).toBeCloseTo(1.94, 1);
    });

    it('keeps a text at its largest size when it fits', () => {
        stubLayout();
        measureWith(1);
        const { result } = renderHook(() =>
            useFitText(options({ text: 'ab', maxFontMm: 6 })),
        );

        expect(result.current.fontSizeMm).toBe(6);
        expect(result.current.lines).toEqual(['ab']);
    });

    it('measures again when a web font finishes loading', () => {
        stubLayout();
        measureWith(5);
        const { result } = renderHook(() => useFitText(options()));
        expect(result.current.fontSizeMm).toBeCloseTo(3.88, 1);

        measureWith(10);
        act(() => {
            fonts.dispatchEvent(new Event('loadingdone'));
        });

        expect(result.current.fontSizeMm).toBeCloseTo(1.94, 1);
    });
});

describe('useFitTextWidth', () => {
    it('gives the width of the widest line at the fitted size', () => {
        stubLayout();
        measureWith(5);
        const { result } = renderHook(() =>
            useFitTextWidth(
                options({
                    text: 'aaaa bb',
                    wrap: 'words',
                    widthMm: 12,
                    heightMm: 30,
                }),
            ),
        );
        const size = result.current.result.fontSizeMm;

        expect(result.current.result.lines).toEqual(['aaaa', 'bb']);
        expect(result.current.widthMm).toBeCloseTo(4 * 0.5 * size, 6);
    });

    it('is zero for an empty text', () => {
        const { result } = renderHook(() =>
            useFitTextWidth(options({ text: '' })),
        );

        expect(result.current.widthMm).toBe(0);
    });
});
