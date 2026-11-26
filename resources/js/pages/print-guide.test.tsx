import { screen, within } from '@testing-library/react';

import PrintGuide from '@/pages/print-guide';
import { renderWithI18n } from '@/testing/render';

const guide = {
    title: 'Printgids',
    seoTitle: 'Printgids: zo print je het',
    description: 'Per onderdeel.',
    introHtml: '<p>Per onderdeel staat hier wat je bestelt.</p>',
    sections: [
        {
            id: 'bord',
            title: 'Bord',
            html: '<p>Een sticker.</p>',
            blocks: [
                {
                    title: 'Bij de drukkerij',
                    html: '<p>Vinylsticker.</p>',
                    spec: '4 stuks · 3 mm afloop',
                    steps: [],
                },
                {
                    title: 'Thuis',
                    html: '<p>A4.</p>',
                    spec: '11 vellen',
                    steps: [],
                },
                {
                    title: 'Plakken',
                    html: '<p>Prik luchtbellen door.</p>',
                    spec: null,
                    steps: ['Ontvet het bord.', 'Leg paneel A.'],
                },
            ],
        },
        {
            id: 'geld',
            title: 'Speelgeld',
            html: '<p>Kopieerwinkel.</p>',
            blocks: [],
        },
    ],
};

describe('PrintGuide', () => {
    it('has one section per part with the HTML from the content file', () => {
        renderWithI18n(<PrintGuide document={guide} />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Printgids' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 2, name: 'Bord' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
    });

    it('shows the print shop and home blocks as columns with a spec line', () => {
        renderWithI18n(<PrintGuide document={guide} />);

        expect(
            screen.getByRole('heading', { level: 3, name: 'Bij de drukkerij' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 3, name: 'Thuis' }),
        ).toBeInTheDocument();
        expect(screen.getByText('4 stuks · 3 mm afloop')).toBeInTheDocument();
        expect(screen.getByText('11 vellen')).toBeInTheDocument();
    });

    it('shows the numbered steps of a block as a list of drawn steps', () => {
        renderWithI18n(<PrintGuide document={guide} />);

        expect(
            screen.getByRole('heading', { level: 3, name: 'Plakken' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(screen.getByText('Leg paneel A.')).toBeInTheDocument();
    });

    it('lists every part in a contents nav that jumps to its section', () => {
        renderWithI18n(<PrintGuide document={guide} />);

        const nav = screen.getByRole('navigation', { name: 'In deze gids' });

        expect(within(nav).getByRole('link', { name: 'Bord' })).toHaveAttribute(
            'href',
            '#bord',
        );
        expect(
            within(nav).getByRole('link', { name: 'Speelgeld' }),
        ).toHaveAttribute('href', '#geld');
        expect(window.document.getElementById('geld')).toBeInTheDocument();
    });
});
