import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BackgroundPhoto } from './background-photo';

const frameOf = (container: HTMLElement) => {
    const frame = container.querySelector<HTMLElement>('[data-background]');
    const image = frame?.querySelector('img');

    return { frame, image };
};

describe('BackgroundPhoto', () => {
    it('covers the area exactly without bleed, laid out on the area plus its bleed', () => {
        const { container } = render(
            <BackgroundPhoto photo={{ src: 'centre.jpg' }} w={100} h={60} />,
        );
        const { frame, image } = frameOf(container);

        expect(frame?.dataset.background).toBe('filled');
        expect(frame?.dataset.w).toBe('106');
        expect(frame?.dataset.h).toBe('66');
        expect(frame?.style.left).toBe('0mm');
        expect(frame?.style.width).toBe('100mm');
        expect(frame?.style.height).toBe('60mm');
        expect(image?.getAttribute('src')).toBe('centre.jpg');
        expect(image?.getAttribute('alt')).toBe('');
        expect(image?.style.left).toBe('-3mm');
        expect(image?.style.width).toBe('106mm');
    });

    it('shows the bleed past the area, at most the photo bleed', () => {
        const { container: some } = render(
            <BackgroundPhoto
                photo={{ src: 'a.jpg' }}
                w={100}
                h={60}
                bleed={2}
            />,
        );
        const { container: much } = render(
            <BackgroundPhoto
                photo={{ src: 'a.jpg' }}
                w={100}
                h={60}
                bleed={9}
            />,
        );

        expect(frameOf(some).frame?.style.left).toBe('-2mm');
        expect(frameOf(some).frame?.style.width).toBe('104mm');
        expect(frameOf(some).image?.style.left).toBe('-1mm');
        expect(frameOf(much).frame?.style.top).toBe('-3mm');
        expect(frameOf(much).frame?.style.height).toBe('66mm');
        expect(frameOf(much).image?.style.top).toBe('0mm');
    });

    it('ignores a negative bleed', () => {
        const { container } = render(
            <BackgroundPhoto
                photo={{ src: 'a.jpg' }}
                w={10}
                h={10}
                bleed={-4}
            />,
        );

        expect(frameOf(container).frame?.style.width).toBe('10mm');
    });

    it('draws a grey photo in grey', () => {
        const { container } = render(
            <BackgroundPhoto
                photo={{
                    src: 'a.jpg',
                    transform: {
                        x: 0.5,
                        y: 0.5,
                        scale: 1,
                        rotation: 0,
                        grayscale: true,
                    },
                }}
                w={10}
                h={10}
            />,
        );

        expect(frameOf(container).image?.style.filter).toBe('grayscale(1)');
    });
});
