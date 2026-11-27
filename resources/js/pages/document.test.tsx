import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Document from '@/pages/document';
import { renderWithI18n } from '@/testing/render';

const page = {
    title: 'Privacy',
    seoTitle: 'Privacy op Printopoly',
    description: 'Wat we bewaren.',
    introHtml: '<p>We bewaren zo weinig mogelijk.</p>',
    sections: [
        {
            id: 'cookies',
            title: 'Cookies',
            html: '<p>Alleen een sessiecookie.</p>',
            blocks: [],
        },
        {
            id: 'fotos',
            title: "Foto's",
            html: '<p>Blijven in je browser.</p>',
            blocks: [],
        },
    ],
};

const heroOf = (): HTMLElement | null =>
    screen
        .getByRole('heading', { level: 1, name: 'Privacy' })
        .closest('section');

describe('Document', () => {
    it('shows the intro and one anchored section per part of the content file', () => {
        renderWithI18n(<Document document={page} />);

        expect(
            screen.getByText('We bewaren zo weinig mogelijk.'),
        ).toBeInTheDocument();
        expect(
            screen
                .getAllByRole('heading', { level: 2 })
                .map((heading) => heading.textContent),
        ).toEqual(['Cookies', "Foto's"]);
        expect(
            screen.getByRole('heading', { name: 'Cookies' }).closest('section'),
        ).toHaveAttribute('id', 'cookies');
        expect(screen.getByText('Blijven in je browser.')).toBeInTheDocument();
    });

    it('sets the SEO title and description', () => {
        renderWithI18n(<Document document={page} />);

        expect(
            document.querySelector('meta[property="og:title"]'),
        ).toHaveAttribute('content', 'Privacy op Printopoly');
        expect(
            document.querySelector('meta[name="description"]'),
        ).toHaveAttribute('content', 'Wat we bewaren.');
    });

    it('gives privacy the chest colour by default', () => {
        renderWithI18n(<Document document={page} />);

        expect(heroOf()).toHaveClass('bg-print-chest');
    });

    it('gives the terms the board colour', () => {
        renderWithI18n(<Document document={page} variant="terms" />);

        expect(heroOf()).toHaveClass('bg-board');
    });
});
