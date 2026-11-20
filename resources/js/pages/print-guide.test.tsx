import type * as InertiaReact from '@inertiajs/react';
import { screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';

import PrintGuide from '@/pages/print-guide';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

const page = vi.hoisted(() => ({ current: {} }));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => page.current,
    Head: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

const guide = {
    title: 'Printgids',
    description: 'Per onderdeel.',
    introHtml: '<p>Per onderdeel staat hier wat je bestelt.</p>',
    sections: [
        { id: 'bord', title: 'Bord', html: '<h3>Thuis</h3><p>A4.</p>' },
        { id: 'geld', title: 'Speelgeld', html: '<p>Kopieerwinkel.</p>' },
    ],
};

describe('PrintGuide', () => {
    beforeEach(() => {
        page.current = fakePage();
    });

    it('has one section per part with the HTML from the content file', () => {
        renderWithI18n(<PrintGuide document={guide} />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Printgids' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 2, name: 'Bord' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { level: 3, name: 'Thuis' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
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
