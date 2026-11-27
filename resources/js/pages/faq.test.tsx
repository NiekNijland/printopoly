import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import Faq from '@/pages/faq';
import { renderWithI18n } from '@/testing/render';

const page = {
    title: 'Vragen',
    seoTitle: 'Veelgestelde vragen',
    description: 'Antwoorden op vragen.',
    introHtml: '<p>Staat je vraag er niet bij?</p>',
    sections: [
        {
            id: 'gratis',
            title: 'Is het gratis?',
            html: '<p>Ja, helemaal.</p>',
            blocks: [],
        },
        {
            id: 'printen',
            title: 'Waar print ik het?',
            html: '<p>Thuis of bij een drukkerij.</p>',
            blocks: [],
        },
    ],
};

describe('Faq', () => {
    it('turns every section into a closed question with its answer', async () => {
        const user = userEvent.setup();
        renderWithI18n(<Faq document={page} />);
        const first = screen.getByText('Is het gratis?').closest('details');

        expect(
            screen.getByRole('heading', { level: 1, name: 'Vragen' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Staat je vraag er niet bij?'),
        ).toBeInTheDocument();
        expect(document.querySelectorAll('details')).toHaveLength(2);
        expect(first).not.toHaveAttribute('open');

        await user.click(screen.getByText('Is het gratis?'));

        expect(first).toHaveAttribute('open');
        expect(first).toHaveTextContent('Ja, helemaal.');
        expect(
            screen.getByText('Waar print ik het?').closest('details'),
        ).toHaveTextContent('Thuis of bij een drukkerij.');
    });

    it('sets the SEO title and description', () => {
        renderWithI18n(<Faq document={page} />);

        expect(
            document.querySelector('meta[property="og:title"]'),
        ).toHaveAttribute('content', 'Veelgestelde vragen · Printopoly');
        expect(
            document.querySelector('meta[name="description"]'),
        ).toHaveAttribute('content', 'Antwoorden op vragen.');
    });
});
