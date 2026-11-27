import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon, PATH_NAMES } from './icons';

const svgOf = (container: HTMLElement) =>
    container.querySelector<SVGSVGElement>('svg[data-icon]');

describe('Icon', () => {
    it('draws the named icon as flat lines on a 20 unit grid, placed in mm', () => {
        const { container } = render(
            <Icon name="train" x={2} y={3} size={8} color="#C8321F" />,
        );
        const svg = svgOf(container);

        expect(svg?.dataset.icon).toBe('train');
        expect(svg?.getAttribute('viewBox')).toBe('0 0 20 20');
        expect(svg?.getAttribute('stroke')).toBe('#C8321F');
        expect(svg?.getAttribute('stroke-width')).toBe('1.75');
        expect(svg?.getAttribute('fill')).toBe('none');
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        expect(svg?.style.left).toBe('2mm');
        expect(svg?.style.top).toBe('3mm');
        expect(svg?.style.width).toBe('8mm');
        expect(svg?.querySelectorAll('path')).toHaveLength(5);
        expect(svg?.querySelector('path')?.getAttribute('d')).toBe(
            'M2.5 12.5V9h8.5V5h6v7.5z',
        );
    });

    it('takes its own line width', () => {
        const { container } = render(
            <Icon
                name="bars"
                x={0}
                y={0}
                size={5}
                color="#000000"
                strokeWidth={1}
            />,
        );

        expect(svgOf(container)?.getAttribute('stroke-width')).toBe('1');
        expect(svgOf(container)?.querySelectorAll('path')).toHaveLength(3);
    });

    it('has a drawing for every name in the set', () => {
        expect(PATH_NAMES).toContain('heart');
        expect(PATH_NAMES).toContain('arrow-left');
        for (const name of PATH_NAMES) {
            const { container, unmount } = render(
                <Icon name={name} x={0} y={0} size={5} color="#000000" />,
            );

            expect(
                svgOf(container)?.querySelectorAll('path').length,
            ).toBeGreaterThan(0);
            unmount();
        }
    });
});
