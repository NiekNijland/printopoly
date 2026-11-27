import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { spaceAt } from '@/lib/render/standard-edition';
import type { CornerSpace } from '@/types/game';

import type { CornerContentProps } from './corner-content';
import { JailCorner } from './corner-jail';

const cornerAt = (position: number): CornerSpace => {
    const space = spaceAt(position);
    if (space.type !== 'corner') {
        throw new Error(`space ${String(position)} is no corner`);
    }

    return space;
};

const props = (position: number): CornerContentProps => ({
    space: cornerAt(position),
    size: 60,
    name: cornerAt(position).name.nl,
    layout: 'text',
    money: (amount) => `€ ${String(amount)}`,
});

const slot = (container: HTMLElement, name: string) =>
    container.querySelector(`[data-slot="${name}"]`);

describe('JailCorner', () => {
    it('draws a barred cell with a plate and "just visiting" along the edges', () => {
        const { container } = render(<JailCorner {...props(10)} />);

        expect(slot(container, 'cell')).not.toBeNull();
        expect(slot(container, 'bars')?.querySelectorAll('rect')).toHaveLength(
            6,
        );
        expect(slot(container, 'in-jail')?.textContent).not.toBe('');
        expect(slot(container, 'visiting')?.textContent).not.toBe('');
        expect(slot(container, 'pawn')).not.toBeNull();
    });

    it('lets the label stand alone when it already names the place', () => {
        const { container } = render(
            <JailCorner {...props(10)} text="Gevangenis" />,
        );

        expect(slot(container, 'in-jail')?.textContent).toBe('Gevangenis');
    });
});
