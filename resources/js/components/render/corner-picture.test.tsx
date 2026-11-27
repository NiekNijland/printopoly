import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { spaceAt } from '@/lib/render/standard-edition';
import type { CornerSpace } from '@/types/game';

import type { CornerContentProps } from './corner-content';
import { PictureCorner } from './corner-picture';

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

describe('PictureCorner', () => {
    it('draws our own car on Free Parking and the cap on Go to Jail', () => {
        expect(
            slot(render(<PictureCorner {...props(20)} />).container, 'car'),
        ).not.toBeNull();
        expect(
            slot(render(<PictureCorner {...props(30)} />).container, 'cap'),
        ).not.toBeNull();
    });

    it('puts a photo in place of the drawing', () => {
        const { container } = render(
            <PictureCorner
                {...props(20)}
                layout="framed"
                photo={{ src: 'a.jpg' }}
            />,
        );

        expect(slot(container, 'car')).toBeNull();
        expect(container.querySelector('img')).not.toBeNull();
    });
});
