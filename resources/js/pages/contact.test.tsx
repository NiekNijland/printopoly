import type * as InertiaReact from '@inertiajs/react';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import Contact from '@/pages/contact';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

const page = vi.hoisted(() => ({ current: {} }));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => page.current,
    Head: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

describe('Contact', () => {
    beforeEach(() => {
        page.current = fakePage();
    });

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
        page.current = fakePage({ locale: 'en' });

        renderWithI18n(<Contact contactEmail="[CONTACTADRES]" />, 'en');

        expect(
            screen.getByRole('heading', {
                name: 'Report something that is not allowed',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Go to the terms' }),
        ).toHaveAttribute('href', '/en/terms');
    });
});
