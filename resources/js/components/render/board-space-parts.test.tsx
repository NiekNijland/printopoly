import { render } from '@testing-library/react';

import { THEMES } from '@/lib/render/themes';

import {
    ColorBand,
    EngravedOval,
    PriceLine,
    groupColor,
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
            <ColorBand
                bleed={2}
                w={30}
                bar={10}
                color="#aa0000"
                town="Delft"
            />,
        ).container;
        const without = render(
            <ColorBand bleed={2} w={30} bar={10} color="#aa0000" />,
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
