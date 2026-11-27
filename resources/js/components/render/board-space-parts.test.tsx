import { render } from '@testing-library/react';

import { spaceAt } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';

import {
    EngravedOval,
    PriceLine,
    groupColor,
    StreetBand,
} from './board-space-parts';

const slot = (container: HTMLElement, name: string) =>
    container.querySelector(`[data-slot="${name}"]`);

describe('the pieces of a classic space', () => {
    it('takes the group colour of the theme, else the standard one', () => {
        expect(groupColor('brown', THEMES.classic)).toMatch(/^#/);
        expect(groupColor('nowhere', THEMES.classic)).toBe('#CFC6B2');
    });

    it('draws the band with the town and a fine rule only when there is a town', () => {
        const withTown = render(
            <StreetBand
                space={spaceAt(1)}
                bleed={2}
                w={30}
                bar={10}
                town="Delft"
            />,
        ).container;
        const without = render(
            <StreetBand space={spaceAt(1)} bleed={2} w={30} bar={10} />,
        ).container;

        expect(slot(withTown, 'town')?.textContent).toBe('Delft');
        expect(slot(withTown, 'band-rule')).not.toBeNull();
        expect(slot(without, 'town')).toBeNull();
        expect(slot(without, 'band-rule')).toBeNull();
        expect(slot(without, 'color-bar')).not.toBeNull();
    });

    it('puts the price under a rule when asked', () => {
        const { container } = render(
            <PriceLine w={30} top={40} text="€ 60" rule />,
        );

        expect(slot(container, 'price')?.textContent).toBe('€ 60');
        expect(slot(container, 'price-rule')).not.toBeNull();
    });

    it('draws an oval with a second line inside', () => {
        const { container } = render(
            <EngravedOval x={1} y={2} w={20} h={10} color="#000" fill="#fff" />,
        );

        expect(
            slot(container, 'oval')?.querySelectorAll('ellipse'),
        ).toHaveLength(2);
    });
});

describe('StreetBand', () => {
    it('draws the colour band of a street in its group colour, and nothing for another space', () => {
        const street = render(
            <StreetBand space={spaceAt(1)} bleed={0} w={20} bar={6} />,
        );
        const station = render(
            <StreetBand space={spaceAt(5)} bleed={0} w={20} bar={6} />,
        );

        expect(
            street.container.querySelector('[data-slot="color-bar"]'),
        ).not.toBeNull();
        expect(station.container.innerHTML).toBe('');
    });
});
