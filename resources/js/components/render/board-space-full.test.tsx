import { render } from '@testing-library/react';

import { spaceAt } from '@/lib/render/standard-edition';

import { FullSpace } from './board-space-full';

describe('FullSpace', () => {
    it('lays the name on a band and the price on a plate over the photo', () => {
        const { container } = render(
            <FullSpace
                space={spaceAt(1)}
                bleed={3}
                w={30}
                h={50}
                bar={10}
                title="Dorpsstraat"
                town="Ons dorp"
                price="€ 60"
                photo={{ src: 'a.jpg', style: 'full' }}
            />,
        );
        const text = (name: string) =>
            container.querySelector(`[data-slot="${name}"]`)?.textContent;

        expect(text('name')).toBe('Dorpsstraat');
        expect(text('price')).toBe('€ 60');
        expect(text('town')).toBe('Ons dorp');
        expect(
            container.querySelector('[data-slot="name-band"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="price-plate"]'),
        ).not.toBeNull();
    });
});
