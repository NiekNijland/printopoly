import { render } from '@testing-library/react';

import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';

import { cardSpots, layoutOfTitle } from './board';
import { CenterContent } from './board-center-content';

const draw = (diagonalName: boolean, background?: { src: string }) => {
    const title = background === undefined ? {} : { background };

    return render(
        <CenterContent
            editionName="Ons Dorp"
            profile={DEFAULT_BOARD_PROFILE}
            diagonalName={diagonalName}
            layout={layoutOfTitle(DEFAULT_BOARD_PROFILE, title)}
            spots={cardSpots(DEFAULT_BOARD_PROFILE)}
            title={title}
        />,
    ).container;
};

describe('CenterContent', () => {
    it('draws the name on the diagonal and both card spots', () => {
        const container = draw(true);

        expect(
            container.querySelector('[data-slot="edition-name-diagonal"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="card-spot-chance"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="card-spot-chest"]'),
        ).not.toBeNull();
    });

    it('keeps the name flat and outlines the spots over a photo', () => {
        const container = draw(false, { src: 'bg.jpg' });

        expect(
            container.querySelector('[data-slot="edition-name"]')?.textContent,
        ).toBe('Ons Dorp');
        expect(
            container.querySelectorAll('[data-slot="spot-plate"]'),
        ).toHaveLength(2);
    });
});
