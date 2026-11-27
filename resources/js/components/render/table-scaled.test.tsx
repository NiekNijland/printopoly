import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Scaled } from './table-scaled';

const PX_PER_MM = 96 / 25.4;

describe('Scaled', () => {
    it('shrinks a true-size drawing to a width in px', () => {
        const { container } = render(
            <Scaled
                widthMm={100}
                heightMm={50}
                width={189}
                className="card"
                style={{ marginTop: 4 }}
            >
                <span>tekening</span>
            </Scaled>,
        );
        const outer = container.firstElementChild;
        const inner = screen.getByText('tekening').parentElement;
        const scale = 189 / (100 * PX_PER_MM);

        expect(outer).toHaveAttribute('aria-hidden', 'true');
        expect(outer).toHaveClass('card');
        expect(outer).toHaveStyle({ width: '189px', marginTop: '4px' });
        expect(
            Number.parseFloat(
                outer instanceof HTMLElement ? outer.style.height : '',
            ),
        ).toBeCloseTo(50 * PX_PER_MM * scale, 3);
        expect(inner?.style.width).toBe('100mm');
        expect(inner?.style.height).toBe('50mm');
        expect(inner?.style.transform).toBe(`scale(${scale})`);
    });

    it('keeps the proportions of the drawing', () => {
        const { container } = render(
            <Scaled widthMm={20} heightMm={40} width={100}>
                <i />
            </Scaled>,
        );

        expect(container.firstElementChild).toHaveStyle({ height: '200px' });
    });
});
