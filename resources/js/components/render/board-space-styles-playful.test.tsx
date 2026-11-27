import { render } from '@testing-library/react';

import { PlayfulProperty } from './board-space-styles-playful';

const BOARD = { style: 'playful' } as const;

const slot = (container: HTMLElement, name: string) =>
    container.querySelector(`[data-slot="${name}"]`);

describe('PlayfulProperty', () => {
    it('draws a street with its colour band, town, name and price', () => {
        const { container } = render(
            <PlayfulProperty
                {...BOARD}
                w={30}
                h={50}
                street
                title="Dorpsstraat"
                town="Ons dorp"
                price="€ 60"
                color="#aa3322"
                fallbackIcon="train"
            />,
        );

        expect(slot(container, 'color-bar')).not.toBeNull();
        expect(slot(container, 'town')?.textContent).toBe('Ons dorp');
        expect(slot(container, 'name')?.textContent).toBe('Dorpsstraat');
        expect(slot(container, 'price')?.textContent).toBe('€ 60');
    });

    it('frames a photo of a station instead of its icon', () => {
        const { container } = render(
            <PlayfulProperty
                {...BOARD}
                w={30}
                h={50}
                street={false}
                title="Station"
                price="€ 200"
                color="#aa3322"
                photo={{ src: 'a.jpg' }}
                fallbackIcon="train"
            />,
        );

        expect(slot(container, 'town')).toBeNull();
        expect(container.querySelector('img')?.getAttribute('src')).toBe(
            'a.jpg',
        );
    });
});
