import { screen } from '@testing-library/react';

import { renderWithI18n } from '@/testing/render';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
    it('says there is no edition yet and offers two ways to start', () => {
        renderWithI18n(<EmptyState locale="nl" />);

        expect(screen.getByText('Je hebt nog geen editie')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Maak een eerste editie, of kijk eerst hoe een ingevulde editie eruitziet.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Nieuwe editie' }),
        ).toHaveAttribute('href', '/nl/editions/new');
        expect(
            screen.getByRole('link', { name: 'Bekijk een ingevulde editie' }),
        ).toHaveAttribute('href', '/nl/editions/sample');
    });

    it('speaks English on the English page and links there', () => {
        renderWithI18n(<EmptyState locale="en" />, 'en');

        expect(
            screen.getByText("You don't have an edition yet"),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'See a filled-in edition' }),
        ).toHaveAttribute('href', '/en/editions/sample');
    });

    it('lays printed pieces on the table as decoration, and the templates below', () => {
        const { container } = renderWithI18n(<EmptyState locale="nl" />);

        const table = container.querySelector('.relative[aria-hidden="true"]');
        expect(table?.children).toHaveLength(3);
        expect(table?.querySelectorAll('svg').length).toBeGreaterThanOrEqual(3);
        expect(
            screen.getByRole('region', { name: 'Begin met…' }),
        ).toBeInTheDocument();
    });
});
