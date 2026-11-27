import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { spaceAt } from '@/lib/render/standard-edition';
import type { CornerSpace } from '@/types/game';

import type { CornerContentProps } from './corner-content';
import { CornerContent } from './corner-content';

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

describe('CornerContent', () => {
    it('draws Start, the jail and the picture corners each their own way', () => {
        expect(
            slot(
                render(<CornerContent {...props(0)} />).container,
                'start-arrow',
            ),
        ).not.toBeNull();
        expect(
            slot(render(<CornerContent {...props(10)} />).container, 'cell'),
        ).not.toBeNull();
        expect(
            slot(render(<CornerContent {...props(20)} />).container, 'car'),
        ).not.toBeNull();
        expect(
            slot(render(<CornerContent {...props(30)} />).container, 'cap'),
        ).not.toBeNull();
    });
});
