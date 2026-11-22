import { screen } from '@testing-library/react';

import { renderWithI18n } from '@/testing/render';

import { ListSearch } from './list-search';

describe('ListSearch', () => {
    it('fades out under the field, so a row scrolling beneath it does not look cut off (bug 28)', () => {
        renderWithI18n(
            <ListSearch tab="board" value="" onChange={() => undefined} />,
        );
        const sticky = screen
            .getByLabelText('Zoek een vak')
            .closest('[data-list-sticky]');

        expect(sticky).toHaveClass('sticky', 'after:bg-linear-to-b');
    });
});
