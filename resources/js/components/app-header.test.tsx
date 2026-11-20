import type * as InertiaReact from '@inertiajs/react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AppHeader } from '@/components/app-header';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

const page = vi.hoisted(() => ({ current: {} }));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => page.current,
}));

describe('AppHeader', () => {
    beforeEach(() => {
        page.current = fakePage();
    });

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
        page.current = fakePage({ auth: { googleLoginEnabled: true } });

        renderWithI18n(<AppHeader />);

        expect(
            screen.getAllByRole('link', { name: 'Inloggen met Google' })[0],
        ).toHaveAttribute('href', '/auth/google/redirect');
    });

    it('shows the account menu with Uitloggen for a logged-in user', async () => {
        page.current = fakePage({
            auth: {
                googleLoginEnabled: true,
                user: { id: '1', name: 'Niek', email: 'niek@example.com' },
            },
        });

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
        page.current = fakePage({ locale: 'en' });

        renderWithI18n(<AppHeader />, 'en');

        expect(
            screen.getAllByRole('link', { name: 'My editions' })[0],
        ).toHaveAttribute('href', '/en/editions');
    });
});
