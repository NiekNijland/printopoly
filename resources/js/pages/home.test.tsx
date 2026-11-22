import type * as InertiaReact from '@inertiajs/react';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import Home from '@/pages/home';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

const page = vi.hoisted(() => ({ current: {} }));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => page.current,
    Head: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

const strings: Record<string, string> = {
    'meta.title': 'Printopoly: maak je eigen editie',
    'meta.description': 'Ontwerp een eigen editie.',
    'hero.title': 'Maak het handelsspel met jullie eigen straten.',
    'hero.body': 'Het bord plak je als sticker.',
    'hero.cta.primary': 'Nieuwe editie',
    'hero.cta.secondary': 'Voorbeeld bekijken',
    'hero.note': 'Je werk blijft in deze browser.',
    'hero.image.alt': 'Voorbeeld van het bord',
    'hero.caption': 'bord ca. 500 × 500 mm',
    'steps.title': 'Zo maak je een editie',
    'steps.intro': 'Je begint met de standaardeditie.',
    'steps.1.title': 'Kies wat je maakt',
    'steps.1.body': 'Alleen het bord.',
    'steps.2.title': 'Ontwerp vak voor vak',
    'steps.2.body': 'Kies een foto.',
    'steps.3.title': 'Los de waarschuwingen op',
    'steps.3.body': 'Zie je meteen.',
    'steps.4.title': 'Print en plak',
    'steps.4.body': 'Kies een set.',
    'sets.title': 'Wat er in de sets zit',
    'sets.shop.title': 'Drukkerij-set',
    'sets.shop.item1': 'Vier vinylstickers',
    'sets.shop.item2': 'Kaartenset',
    'sets.shop.item3': 'Geld voor de kopieerwinkel',
    'sets.shop.link': 'Wat je bestelt',
    'sets.home.title': 'Thuisprint-set',
    'sets.home.item1': 'Sticker op A4',
    'sets.home.item2': 'Vouwkaart',
    'sets.home.item3': 'Geld op A4',
    'sets.home.link': 'Hoe je het print',
    'faq.title': 'Vragen',
    'faq.link': 'Alle vragen',
};

const faq = [{ question: 'Wat kost het?', answerHtml: '<p>Niets.</p>' }];

describe('Home', () => {
    beforeEach(() => {
        page.current = fakePage();
    });

    it('shows the hero from landing.json with one h1', () => {
        renderWithI18n(<Home strings={strings} faq={faq} />);

        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Maak het handelsspel met jullie eigen straten.',
            }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('sends Nieuwe editie to the new edition screen and Voorbeeld bekijken to the sample edition', () => {
        renderWithI18n(<Home strings={strings} faq={faq} />);

        expect(
            screen.getByRole('link', { name: 'Nieuwe editie' }),
        ).toHaveAttribute('href', '/nl/editions/new');
        expect(
            screen.getByRole('link', { name: 'Voorbeeld bekijken' }),
        ).toHaveAttribute('href', '/nl/editions/sample');
    });

    it('lists the four steps and the two sets, linking to the print guide', () => {
        renderWithI18n(<Home strings={strings} faq={faq} />);

        expect(screen.getByText('Print en plak')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Drukkerij-set' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Hoe je het print' }),
        ).toHaveAttribute('href', '/nl/printgids');
    });

    it('shows the home set first, and no longer the Samen maken block or the sticker steps (B199, B202, B205)', () => {
        const { container } = renderWithI18n(
            <Home strings={strings} faq={faq} />,
        );
        const sets = screen
            .getAllByRole('heading', { level: 3 })
            .map((heading) => heading.textContent);

        expect(sets).toEqual(['Thuisprint-set', 'Drukkerij-set']);
        expect(container.querySelector('#samen')).toBeNull();
        expect(container.querySelector('#sticker')).toBeNull();
    });

    it('writes the step numbers in a red that is dark enough on mint (bug 31)', () => {
        const { container } = renderWithI18n(
            <Home strings={strings} faq={faq} />,
        );
        const numbers = [...container.querySelectorAll('ol li span.font-mono')];

        expect(numbers.map((node) => node.textContent)).toEqual([
            '1',
            '2',
            '3',
            '4',
        ]);
        for (const number of numbers) {
            expect(number).toHaveClass('text-press-text');
        }
    });

    it('describes the board illustration once and shows the questions', () => {
        renderWithI18n(<Home strings={strings} faq={faq} />);

        expect(
            screen.getByRole('img', { name: 'Voorbeeld van het bord' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Wat kost het?')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Alle vragen' }),
        ).toHaveAttribute('href', '/nl/vragen');
    });

    it('sizes the question columns only side by side, so a phone has no gap under Alle vragen (designcheck ronde 5)', () => {
        renderWithI18n(<Home strings={strings} faq={faq} />);

        // Under md the section is a column: a flex basis there is a height, and 240 px left ~200 px of white.
        const heading = screen.getByRole('link', { name: 'Alle vragen' })
            .parentElement as HTMLElement;
        const list = heading.nextElementSibling as HTMLElement;
        for (const column of [heading, list]) {
            const bases = [...column.classList].filter((name) =>
                name.startsWith('flex-['),
            );
            expect(bases).toEqual([]);
        }
        expect(heading).toHaveClass('md:flex-[1_1_240px]');
    });
});
