import { screen } from '@testing-library/react';

import Contact from '@/pages/contact';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

describe('Contact', () => {
    it('shows the placeholder as plain text until there is an address', () => {
        renderWithI18n(<Contact contactEmail="[CONTACTADRES]" />);

        expect(screen.getByText('[CONTACTADRES]')).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: '[CONTACTADRES]' }),
        ).not.toBeInTheDocument();
    });

    it('links a real address with mailto', () => {
        renderWithI18n(<Contact contactEmail="hallo@printopoly.nl" />);

        expect(
            screen.getByRole('link', { name: 'hallo@printopoly.nl' }),
        ).toHaveAttribute('href', 'mailto:hallo@printopoly.nl');
    });

    it('has a section for reports and a link to the terms in the current language', () => {
        setPage(fakePage({ locale: 'en' }));

        renderWithI18n(<Contact contactEmail="[CONTACTADRES]" />, 'en');

        expect(
            screen.getByRole('heading', {
                name: "Report something that shouldn't be here",
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Read the terms' }),
        ).toHaveAttribute('href', '/en/terms');
    });
});
