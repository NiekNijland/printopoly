import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppHeader } from '@/components/app-header';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

describe('AppHeader', () => {
    it('links the logo, Mijn edities and Printgids in the current language', () => {
        renderWithI18n(<AppHeader />);

        const nav = screen.getAllByRole('navigation', {
            name: 'Hoofdmenu',
        })[0]!;

        expect(
            within(nav).getByRole('link', { name: 'Mijn edities' }),
        ).toHaveAttribute('href', '/nl/editions');
        expect(
            within(nav).getByRole('link', { name: 'Printgids' }),
        ).toHaveAttribute('href', '/nl/printgids');
        expect(
            screen.getAllByRole('link', { name: /Printopoly/ })[0],
        ).toHaveAttribute('href', '/nl');
    });

    it('keeps Mijn edities one tap away on a phone, outside the menu sheet', () => {
        renderWithI18n(<AppHeader />);

        expect(
            screen
                .getAllByRole('link', { name: 'Mijn edities' })
                .some((link) => link.closest('nav') === null),
        ).toBe(true);
    });

    it('falls back to the menu below 1024 px, so the header fits an upright iPad (bug 15)', () => {
        renderWithI18n(<AppHeader />);

        const menu = screen.getByRole('button', { name: 'Menu' });
        const nav = screen.getAllByRole('navigation', {
            name: 'Hoofdmenu',
        })[0]!;

        expect(menu).toHaveClass('lg:hidden');
        expect(menu).not.toHaveClass('md:hidden');
        expect(nav).toHaveClass('hidden', 'lg:flex');
        expect(nav).not.toHaveClass('md:flex');
    });

    it('offers Nieuwe editie as the call to action, the same name as on Mijn edities (vindbaarheid)', () => {
        renderWithI18n(<AppHeader />);

        expect(
            screen.getAllByRole('link', { name: 'Nieuwe editie' })[0],
        ).toHaveAttribute('href', '/nl/editions/new');
        expect(
            screen.queryByRole('link', { name: 'Editie maken' }),
        ).not.toBeInTheDocument();
    });

    it('says Mijn edities next to the folder on a phone too, not only an icon (vindbaarheid 1.1, R5-23)', () => {
        renderWithI18n(<AppHeader />);

        const folder = screen
            .getAllByRole('link', { name: 'Mijn edities' })
            .find((link) => link.classList.contains('lg:hidden'));

        expect(folder).toHaveTextContent('Mijn edities');
        const label = folder?.querySelector('span');
        expect(label).not.toHaveClass('hidden');
        expect(label).not.toHaveAttribute('aria-hidden');
    });

    it('marks the link of the current page', () => {
        setPage({ ...fakePage(), url: '/nl/printgids' });

        renderWithI18n(<AppHeader />);

        const nav = screen.getAllByRole('navigation', {
            name: 'Hoofdmenu',
        })[0]!;

        expect(
            within(nav).getByRole('link', { name: 'Printgids' }),
        ).toHaveAttribute('aria-current', 'page');
        expect(
            within(nav).getByRole('link', { name: 'Mijn edities' }),
        ).not.toHaveAttribute('aria-current');
    });

    it('marks the current language and links the other one', () => {
        renderWithI18n(<AppHeader />);

        const nl = screen.getAllByRole('link', { name: 'NL' })[0]!;
        const en = screen.getAllByRole('link', { name: 'EN' })[0]!;

        expect(nl).toHaveAttribute('aria-current', 'true');
        expect(en).toHaveAttribute('href', 'http://localhost/en');
        expect(en).toHaveAttribute('lang', 'en');
    });

    it('hides the login button while Google is not configured', () => {
        renderWithI18n(<AppHeader />);

        expect(
            screen.queryByRole('link', { name: 'Inloggen met Google' }),
        ).not.toBeInTheDocument();
    });

    it('offers Inloggen met Google when it is configured', () => {
        setPage(fakePage({ auth: { googleLoginEnabled: true } }));

        renderWithI18n(<AppHeader />);

        expect(
            screen.getAllByRole('link', { name: 'Inloggen met Google' })[0],
        ).toHaveAttribute('href', '/auth/google/redirect');
    });

    it('shows the account menu with Uitloggen for a logged-in user', async () => {
        setPage(
            fakePage({
                auth: {
                    googleLoginEnabled: true,
                    user: { id: '1', name: 'Niek', email: 'niek@example.com' },
                },
            }),
        );

        renderWithI18n(<AppHeader />);

        const account = screen.getAllByRole('button', {
            name: 'Account van Niek',
        })[0]!;
        expect(account).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(account);

        expect(account).toHaveAttribute('aria-expanded', 'true');
        expect(
            screen.getByRole('button', { name: 'Uitloggen' }),
        ).toBeInTheDocument();
    });

    it('opens the menu on a phone', async () => {
        renderWithI18n(<AppHeader />);

        const menu = screen.getByRole('button', { name: 'Menu' });
        await userEvent.click(menu);

        expect(menu).toHaveAttribute('aria-expanded', 'true');
        expect(document.getElementById('mobile-menu')).toBeInTheDocument();
    });

    it('speaks English on /en', () => {
        setPage(fakePage({ locale: 'en' }));

        renderWithI18n(<AppHeader />, 'en');

        expect(
            screen.getAllByRole('link', { name: 'My editions' })[0],
        ).toHaveAttribute('href', '/en/editions');
    });
});
