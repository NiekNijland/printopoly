import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SpaceIconArt } from './space-icon';

const box = { x: 2, y: 3, size: 10, color: '#1B1F24' };

describe('SpaceIconArt', () => {
    it('draws the standard icon without a choice', () => {
        const { container } = render(
            <SpaceIconArt fallback="train" {...box} />,
        );
        const svg = container.querySelector<SVGSVGElement>('[data-icon]');

        expect(svg?.dataset.icon).toBe('train');
        expect(svg?.getAttribute('stroke-width')).toBe('1.75');
        expect(svg?.style.left).toBe('2mm');
    });

    it('draws nothing for a space without an icon', () => {
        const { container } = render(<SpaceIconArt fallback={null} {...box} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('draws the chosen icon with its own line width', () => {
        const { container } = render(
            <SpaceIconArt
                icon={{ preset: 'rocket' }}
                fallback="train"
                strokeWidth={1.2}
                {...box}
            />,
        );
        const svg = container.querySelector('[data-icon]');

        expect(svg?.getAttribute('data-icon')).toBe('rocket');
        expect(svg?.getAttribute('stroke-width')).toBe('1.2');
    });

    it('draws a lucide icon cut to the same 20 unit grid', () => {
        const { container } = render(
            <SpaceIconArt
                icon={{ preset: 'lucide:coins' }}
                fallback={null}
                {...box}
            />,
        );
        const svg = container.querySelector<SVGSVGElement>('[data-icon]');

        expect(svg?.dataset.icon).toBe('lucide:coins');
        expect(svg?.getAttribute('viewBox')).toBe('2 2 20 20');
        expect(svg?.getAttribute('stroke-width')).toBe('1.75');
        expect(svg?.style.width).toBe('10mm');
    });

    it('draws nothing for a lucide icon that is not in the set', () => {
        const { container } = render(
            <SpaceIconArt
                icon={{ preset: 'lucide:does-not-exist' }}
                fallback="train"
                {...box}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('draws a wide uploaded image whole, centred in the box', () => {
        const { container } = render(
            <SpaceIconArt
                icon={{ photo: { src: 'logo.png' }, aspect: 2 }}
                fallback="train"
                {...box}
            />,
        );
        const frame = container.querySelector<HTMLElement>('[data-icon-photo]');

        expect(frame?.dataset.w).toBe('10');
        expect(frame?.dataset.h).toBe('5');
        expect(frame?.style.left).toBe('2mm');
        expect(frame?.style.top).toBe('5.5mm');
        expect(frame?.querySelector('img')).toHaveAttribute('src', 'logo.png');
        expect(frame?.querySelector('img')?.style.objectFit).toBe('fill');
    });

    it('draws a standing image whole, and a broken aspect as a square', () => {
        const standing = render(
            <SpaceIconArt
                icon={{ photo: { src: 'a.png' }, aspect: 0.5 }}
                fallback={null}
                {...box}
            />,
        ).container.querySelector<HTMLElement>('[data-icon-photo]');
        const broken = render(
            <SpaceIconArt
                icon={{ photo: { src: 'b.png' }, aspect: Number.NaN }}
                fallback={null}
                {...box}
            />,
        ).container.querySelector<HTMLElement>('[data-icon-photo]');

        expect(standing?.dataset.w).toBe('5');
        expect(standing?.style.left).toBe('4.5mm');
        expect(broken?.dataset.w).toBe('10');
        expect(broken?.dataset.h).toBe('10');
    });
});
