import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ErrorPage from '@/pages/error';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

describe('ErrorPage', () => {
    it.each([
        [403, 'Geen toegang', 'Je mag deze pagina niet openen.'],
        [
            404,
            'Deze pagina bestaat niet',
            'De pagina die je zocht is er niet, of de link is veranderd.',
        ],
        [
            419,
            'Deze pagina is verlopen',
            'Laad de pagina opnieuw en probeer het nog een keer.',
        ],
        [
            500,
            'Er ging iets mis',
            'Dit ligt aan ons. Probeer het over een paar minuten nog eens.',
        ],
        [
            503,
            'Even niet beschikbaar',
            'Printopoly wordt bijgewerkt. Probeer het zo nog eens.',
        ],
    ])('explains a %i in its own words', (status, heading, body) => {
        renderWithI18n(<ErrorPage status={status} />);

        expect(
            screen.getByRole('heading', { level: 1, name: heading }),
        ).toBeInTheDocument();
        expect(screen.getByText(body)).toBeInTheDocument();
    });

    it('treats an unknown status as a 500', () => {
        renderWithI18n(<ErrorPage status={429} />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Er ging iets mis' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Dit ligt aan ons. Probeer het over een paar minuten nog eens.',
            ),
        ).toBeInTheDocument();
    });

    it('links home in the current language', () => {
        setPage(fakePage({ locale: 'en' }));

        renderWithI18n(<ErrorPage status={404} />, 'en');

        expect(
            screen.getByRole('link', { name: 'Go to the home page' }),
        ).toHaveAttribute('href', '/en');
        expect(
            screen.getByRole('heading', { name: 'This page does not exist' }),
        ).toBeInTheDocument();
    });
});
