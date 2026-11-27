import { render } from '@testing-library/react';

import { SetArt } from './set-art';

const itemsOf = (container: HTMLElement): Element[] => [
    ...container.querySelectorAll('[data-settle]'),
];

describe('SetArt', () => {
    it('shows the panels and a fan of cards from the print shop', () => {
        const { container } = render(<SetArt set="shop" />);

        const items = itemsOf(container);
        expect(items).toHaveLength(2);
        expect(items[0]).toHaveStyle({ left: '22px', top: '34px' });
        expect(items[1]).toHaveStyle({ left: '156px' });
    });

    it('shows a sheet of spaces with crop marks and a sheet of notes from the own printer', () => {
        const { container } = render(<SetArt set="home" />);

        const items = itemsOf(container);
        expect(items).toHaveLength(2);
        expect(items[0]).toHaveStyle({ left: '18px', top: '26px' });
        expect(items[0]?.querySelector('.grid')?.children).toHaveLength(6);
        expect(items[1]).toHaveStyle({ left: '198px' });
    });
});
