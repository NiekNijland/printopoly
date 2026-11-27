import { render } from '@testing-library/react';

import { HeroTable } from './hero-table';

describe('HeroTable', () => {
    it('lays the board, three cards, two notes and three pawns on the table, without dice', () => {
        const { container } = render(<HeroTable />);

        const items = [...container.querySelectorAll('[data-settle]')];
        expect(items).toHaveLength(9);
        expect(items[0]).toHaveStyle({
            left: '22px',
            top: '34px',
            zIndex: '1',
        });
        expect(
            items.map((item) =>
                item instanceof HTMLElement
                    ? item.style.getPropertyValue('--rot')
                    : '',
            ),
        ).toEqual([
            '-5deg',
            '9deg',
            '-7deg',
            '5deg',
            '4deg',
            '-6deg',
            '-8deg',
            '-4deg',
            '6deg',
        ]);
    });

    it('is decoration for screen readers', () => {
        const { container } = render(<HeroTable />);

        expect(container.firstElementChild).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });
});
