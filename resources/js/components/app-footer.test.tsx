import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppFooter } from '@/components/app-footer';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

describe('AppFooter', () => {
    it('links the four Dutch pages in the footer navigation', () => {
        renderWithI18n(<AppFooter />);

        const nav = screen.getByRole('navigation', { name: 'Voettekst' });
        const links = within(nav).getAllByRole('link');

        expect(links.map((link) => link.textContent)).toEqual([
            'Printgids',
            'Privacy',
            'Voorwaarden',
            'Contact',
        ]);
        expect(links.map((link) => link.getAttribute('href'))).toEqual([
            '/nl/printgids',
            '/nl/privacy',
            '/nl/voorwaarden',
            '/nl/contact',
        ]);
    });

    it('follows the English page addresses and catalogue', () => {
        setPage(fakePage({ locale: 'en' }));
        renderWithI18n(<AppFooter />, 'en');

        const nav = screen.getByRole('navigation', { name: 'Footer' });

        expect(
            within(nav).getByRole('link', { name: 'Print guide' }),
        ).toHaveAttribute('href', '/en/print-guide');
        expect(
            within(nav).getByRole('link', { name: 'Terms' }),
        ).toHaveAttribute('href', '/en/terms');
    });

    it('says it is not affiliated and links the maker as rel="me"', () => {
        renderWithI18n(<AppFooter />);

        expect(
            screen.getByText(
                'Printopoly is niet verbonden aan Hasbro. Monopoly® is een merk van Hasbro.',
            ),
        ).toBeInTheDocument();
        const maker = screen.getByRole('link', {
            name: 'Gemaakt door NiekNijland op GitHub',
        });
        expect(maker).toHaveAttribute('href', 'https://github.com/NiekNijland');
        expect(maker).toHaveAttribute('rel', 'me noopener');
    });

    it('is the page footer landmark', () => {
        renderWithI18n(<AppFooter />);

        expect(screen.getByRole('contentinfo')).toHaveClass('bg-ink');
    });
});
