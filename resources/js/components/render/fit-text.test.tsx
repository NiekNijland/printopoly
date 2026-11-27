import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FitTextResult } from '@/lib/render/fit-text';

import { FitText, type FitTextProps } from './fit-text';
import { Sheet } from './sheet';

const box = (container: HTMLElement, slot = 'text') =>
    container.querySelector<HTMLElement>(`[data-slot="${slot}"]`);

const base: FitTextProps = {
    text: 'Molenweg',
    x: 1,
    y: 2,
    w: 40,
    h: 10,
    maxFontMm: 5,
    minFontMm: 2,
    slot: 'text',
};

describe('FitText', () => {
    it('places the text in its box and reports that it fits', () => {
        const { container, getByText } = render(<FitText {...base} />);
        const outer = box(container);

        expect(outer?.style.left).toBe('1mm');
        expect(outer?.style.top).toBe('2mm');
        expect(outer?.style.justifyContent).toBe('flex-start');
        expect(outer?.style.alignItems).toBe('center');
        expect(outer?.style.overflow).toBe('');
        expect(outer?.dataset.fits).toBe('true');
        expect(outer?.dataset.overflowChars).toBe('0');
        expect(outer?.dataset.fontSizeMm).toBe('5');
        expect(getByText('Molenweg').style.whiteSpace).toBe('pre');
        expect(getByText('Molenweg').style.fontWeight).toBe('400');
    });

    it('says how much does not fit and clips it when asked', () => {
        const { container } = render(
            <FitText {...base} text={'x'.repeat(200)} w={10} h={3} clip />,
        );
        const outer = box(container);

        expect(outer?.dataset.fits).toBe('false');
        expect(Number(outer?.dataset.overflowChars)).toBeGreaterThan(0);
        expect(outer?.dataset.fontSizeMm).toBe('2');
        expect(outer?.style.overflow).toBe('hidden');
    });

    it('tells the caller the fit result', () => {
        const onFit = vi.fn<(result: FitTextResult) => void>();
        render(<FitText {...base} onFit={onFit} />);

        expect(onFit).toHaveBeenCalledOnce();
        expect(onFit.mock.calls[0]?.[0].fits).toBe(true);
    });

    it('uses the fonts of the theme for each role', () => {
        const { getByText } = render(
            <Sheet
                element="test"
                theme="gala"
                locale="nl"
                widthMm={100}
                heightMm={100}
                background="#FFFFFF"
            >
                <FitText {...base} text="Kop" font="heading" slot="a" />
                <FitText {...base} text="Titel" font="title" slot="b" />
                <FitText {...base} text="Code" font="mono" slot="c" />
                <FitText {...base} text="Tekst" slot="d" />
            </Sheet>,
        );

        expect(getByText('Kop').style.fontFamily).toContain('Playfair Display');
        expect(getByText('Kop').style.textTransform).toBe('none');
        expect(getByText('Titel').style.fontFamily).toContain('Great Vibes');
        expect(getByText('Code').style.fontFamily).toContain('Instrument Sans');
        expect(getByText('Tekst').style.fontFamily).toContain(
            'Instrument Sans',
        );
    });

    it('takes an own family and weight, drawn without the heading case', () => {
        const { getByText } = render(
            <FitText
                {...base}
                text="Eigen"
                font="heading"
                family="Courier"
                weight={600}
            />,
        );

        expect(getByText('Eigen').style.fontFamily).toBe('Courier');
        expect(getByText('Eigen').style.fontWeight).toBe('600');
        expect(getByText('Eigen').style.textTransform).toBe('');
    });

    it('sets capitals, italics, spacing, wrapping and alignment', () => {
        const { container, getByText } = render(
            <FitText
                {...base}
                text="klein regeltje"
                caps
                italic
                letterSpacingEm={0.1}
                wrap="words"
                align="right"
                valign="bottom"
                color="#123456"
            />,
        );
        const inner = getByText('klein regeltje');

        expect(inner.style.textTransform).toBe('uppercase');
        expect(inner.style.fontStyle).toBe('italic');
        expect(inner.style.letterSpacing).toBe('0.1em');
        expect(inner.style.whiteSpace).toBe('pre-line');
        expect(inner.style.textAlign).toBe('right');
        expect(inner.style.color).toBe('#123456');
        expect(box(container)?.style.justifyContent).toBe('flex-end');
        expect(box(container)?.style.alignItems).toBe('flex-end');
    });
});
