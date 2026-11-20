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
    'hero.cta.primary': 'Editie maken',
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
    'sets.note': 'Je kunt beide combineren.',
    'sticker.title': 'Zo plak je de bordsticker',
    'sticker.intro': 'De stickers stoppen 1 mm voor elke vouw.',
    'sticker.step1': 'Maak het bord vetvrij.',
    'sticker.step2': 'Leg paneel A.',
    'sticker.step3': 'Druk aan.',
    'sticker.step4': 'Klap dicht.',
    'sticker.link': 'Naar de printgids',
    'sticker.diagram.alt': 'Schema van vier panelen',
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

    it('sends Editie maken to the new edition screen and Voorbeeld bekijken to the sample edition', () => {
        renderWithI18n(<Home strings={strings} faq={faq} />);

        expect(
            screen.getByRole('link', { name: 'Editie maken' }),
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
        expect(
            screen.getByRole('link', { name: 'Naar de printgids' }),
        ).toHaveAttribute('href', '/nl/printgids');
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
});
