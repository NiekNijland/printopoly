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

    it('says the hint shorter where the field is narrow, next to the photo button (R6 Kees, 320 px)', () => {
        renderWithI18n(
            <ListSearch tab="board" value="" onChange={() => undefined} />,
        );
        const hint = document.querySelector('[data-search-hint]');

        expect(hint).not.toBeNull();
        expect(hint?.textContent).toContain('Zoek of plak namen');
        expect(hint?.textContent).toContain('Zoek een vak of plak namen');
        expect(
            screen.getByText('Zoek of plak namen').className,
        ).toContain('@[16rem]/search:hidden');
    });

    it('drops the hint once something is typed', () => {
        renderWithI18n(
            <ListSearch tab="board" value="Dorp" onChange={() => undefined} />,
        );

        expect(document.querySelector('[data-search-hint]')).toBeNull();
    });
});
