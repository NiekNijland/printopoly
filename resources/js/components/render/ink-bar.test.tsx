import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { THEMES } from '@/lib/render/themes';

import { InkBar } from './ink-bar';

const inks = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>('span')].map(
        (span) => span.style.background,
    );

describe('InkBar', () => {
    it('shows cyan, magenta, yellow and black in the colours of the theme', () => {
        const { container } = render(
            <InkBar x={4} y={5} w={30} theme={THEMES.classic} />,
        );
        const bar = container.querySelector<HTMLElement>('div');

        expect(inks(container)).toEqual([
            '#00A3E0',
            '#E6007E',
            '#FFD500',
            '#1B1F24',
        ]);
        expect(bar?.style.left).toBe('4mm');
        expect(bar?.style.top).toBe('5mm');
        expect(bar?.style.width).toBe('30mm');
        expect(bar?.style.height).toBe('1.6mm');
        expect(container.querySelector('span')?.style.height).toBe('1.6mm');
    });

    it('shows the gold of Gala instead of yellow, at its own height', () => {
        const { container } = render(
            <InkBar x={0} y={0} w={30} h={3} theme={THEMES.gala} />,
        );

        expect(inks(container)[2]).toBe('#B8923F');
        expect(container.querySelector('span')?.style.height).toBe('3mm');
    });
});
