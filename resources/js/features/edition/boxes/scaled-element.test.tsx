import { render, screen } from '@testing-library/react';

import { ScaledElement } from './scaled-element';

const PX_PER_MM = 96 / 25.4;

const outerOf = (container: HTMLElement): HTMLElement => {
    const outer = container.firstElementChild;
    if (!(outer instanceof HTMLElement)) {
        throw new Error('nothing rendered');
    }

    return outer;
};

const innerOf = (container: HTMLElement): HTMLElement => {
    const inner = outerOf(container).firstElementChild;
    if (!(inner instanceof HTMLElement)) {
        throw new Error('no inner box');
    }

    return inner;
};

describe('ScaledElement', () => {
    it('draws the element at true size and shrinks it into the box', () => {
        const { container } = render(
            <ScaledElement
                widthMm={100}
                heightMm={50}
                maxWidth={189}
                maxHeight={500}
            >
                <span>Kaart</span>
            </ScaledElement>,
        );
        const width = 100 * PX_PER_MM;
        const scale = 189 / width;

        expect(screen.getByText('Kaart')).toBeInTheDocument();
        expect(parseFloat(innerOf(container).style.width)).toBeCloseTo(width);
        expect(innerOf(container).style.transform).toBe(
            `scale(${String(scale)})`,
        );
        expect(innerOf(container).style.transformOrigin).toBe('top left');
        expect(parseFloat(outerOf(container).style.width)).toBeCloseTo(189);
        expect(parseFloat(outerOf(container).style.height)).toBeCloseTo(94.5);
    });

    it('fits the height when that is the tighter side', () => {
        const { container } = render(
            <ScaledElement
                widthMm={50}
                heightMm={100}
                maxWidth={500}
                maxHeight={100}
            >
                <span />
            </ScaledElement>,
        );

        expect(parseFloat(outerOf(container).style.height)).toBeCloseTo(100);
        expect(parseFloat(outerOf(container).style.width)).toBeCloseTo(50);
    });

    it('never draws bigger than true size, unless it may enlarge', () => {
        const small = render(
            <ScaledElement
                widthMm={10}
                heightMm={10}
                maxWidth={500}
                maxHeight={500}
            >
                <span />
            </ScaledElement>,
        );
        const large = render(
            <ScaledElement
                widthMm={10}
                heightMm={10}
                maxWidth={500}
                maxHeight={500}
                enlarge={2}
            >
                <span />
            </ScaledElement>,
        );

        expect(innerOf(small.container).style.transform).toBe('scale(1)');
        expect(innerOf(large.container).style.transform).toBe('scale(2)');
    });
});
