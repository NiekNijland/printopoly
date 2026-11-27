import { render, screen } from '@testing-library/react';

import { centerRect } from '@/lib/render/print-board';
import { makeEdition } from '@/testing/edition-test-utils';

import { MiniCenter } from './mini-center';

const innerOf = (): HTMLElement => {
    const inner = screen.getByTestId('mini-center').firstElementChild;
    if (!(inner instanceof HTMLElement)) {
        throw new Error('no inner box');
    }

    return inner;
};

describe('MiniCenter', () => {
    it('stays hidden until its cell has a width', () => {
        render(<MiniCenter edition={makeEdition()} />);

        expect(innerOf().style.visibility).toBe('hidden');
    });

    it('draws the real centre with the edition name, scaled to the cell', () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
            120,
        );
        const edition = makeEdition({ name: 'Buurtfeest' });

        render(<MiniCenter edition={edition} photos={new Map()} />);

        const centre = centerRect(edition.boardProfile);
        expect(innerOf().style.visibility).toBe('');
        expect(innerOf().style.transform).toBe(
            `scale(${String(120 / ((centre.w * 96) / 25.4))})`,
        );
        expect(screen.getByTestId('mini-center')).toHaveTextContent(
            'Buurtfeest',
        );
        expect(screen.getByTestId('mini-center')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });
});
