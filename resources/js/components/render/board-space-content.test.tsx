import { render } from '@testing-library/react';

import { spaceAt } from '@/lib/render/standard-edition';

import { SpaceContent } from './board-space-content';

const draw = (position: number, name?: string) =>
    render(
        <SpaceContent
            space={spaceAt(position)}
            bleed={0}
            w={30}
            h={50}
            name={name}
            layout="text"
            full={false}
        />,
    ).container;

describe('SpaceContent', () => {
    it('draws a tax space with its amount in an oval', () => {
        const container = draw(4);

        expect(container.querySelector('[data-slot="oval"]')).not.toBeNull();
        expect(
            container.querySelector('[data-slot="amount"]')?.textContent,
        ).toContain('200');
    });

    it('draws a deck space with its own name', () => {
        const container = draw(7, 'Verrassing');

        expect(container.querySelector('[data-slot="name"]')?.textContent).toBe(
            'Verrassing',
        );
    });

    it('draws a street through the property content', () => {
        expect(draw(1).querySelector('[data-slot="color-bar"]')).not.toBeNull();
    });
});
