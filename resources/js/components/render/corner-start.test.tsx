import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { spaceAt } from '@/lib/render/standard-edition';
import type { CornerSpace } from '@/types/game';

import type { CornerContentProps } from './corner-content';
import { StartCorner } from './corner-start';

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

describe('StartCorner', () => {
    it('sets the name and the salary on the diagonal over the long arrow', () => {
        const { container } = render(<StartCorner {...props(0)} />);

        expect(slot(container, 'name')?.textContent).not.toBe('');
        expect(slot(container, 'salary')?.textContent).toContain('€');
        expect(slot(container, 'start-arrow')).not.toBeNull();
    });
});
