import { render } from '@testing-library/react';

import { spaceAt } from '@/lib/render/standard-edition';
import type { OwnableSpace } from '@/types/game';

import { PropertyContent } from './board-space-property';
import { Sheet } from './sheet';

const ownable = (position: number): OwnableSpace => {
    const space = spaceAt(position);
    if (
        space.type !== 'street' &&
        space.type !== 'station' &&
        space.type !== 'utility'
    ) {
        throw new Error('not ownable');
    }

    return space;
};

const draw = (position: number, style?: 'modern') =>
    render(
        <Sheet
            element="test"
            theme="classic"
            locale="nl"
            widthMm={30}
            heightMm={50}
            background="#fff"
            {...(style === undefined
                ? {}
                : { style: { parts: { board: style } } })}
        >
            <PropertyContent
                space={ownable(position)}
                bleed={0}
                w={30}
                h={50}
                title="Naam"
                town=" Stad "
                layout="text"
                full={false}
            />
        </Sheet>,
    ).container;

describe('PropertyContent', () => {
    it('draws a classic street with its band, the trimmed town and the price', () => {
        const container = draw(1);

        expect(
            container.querySelector('[data-slot="color-bar"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-slot="town"]')?.textContent).toBe(
            'Stad',
        );
        expect(
            container.querySelector('[data-slot="price"]')?.textContent,
        ).toBe('€\u00A060');
    });

    it('draws a station without a band, in the style of the board', () => {
        const container = draw(5, 'modern');

        expect(container.querySelector('[data-slot="town"]')).toBeNull();
        expect(container.querySelector('[data-slot="name"]')?.textContent).toBe(
            'Naam',
        );
        expect(
            container.querySelector('[data-slot="price-rule"]'),
        ).not.toBeNull();
    });
});
