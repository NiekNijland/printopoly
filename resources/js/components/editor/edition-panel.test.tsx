import type * as InertiaReact from '@inertiajs/react';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CollectionBox } from '@/hooks/use-collection-box';
import { useSessionSnapshot } from '@/hooks/use-edition-session';
import type { OwnerBox } from '@/lib/boxes/types';
import { EditionBus } from '@/lib/edition/bus';
import { resolveEdition } from '@/lib/edition/resolve';
import { EditionSession } from '@/lib/edition/session';
import { MemoryEditionStorage } from '@/lib/edition/storage';
import type { Edition } from '@/lib/edition/types';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { EditionPanel } from './edition-panel';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage(),
}));

function fakeCollect(box: OwnerBox | null = null): CollectionBox {
    return {
        box,
        loaded: true,
        busy: false,
        error: false,
        errorReason: null,
        start: vi.fn(() => Promise.resolve()),
        refresh: vi.fn(() => Promise.resolve()),
        close: vi.fn(() => Promise.resolve()),
        renew: vi.fn(() => Promise.resolve()),
        remove: vi.fn(() => Promise.resolve()),
        resolve: vi.fn(() => Promise.resolve()),
        hideCards: vi.fn(() => Promise.resolve()),
        secret: null,
    };
}

const openBox = (overrides: Partial<OwnerBox> = {}): OwnerBox => ({
    id: 'b1',
    editionId: 'sample-edition-1',
    url: 'https://printopoly.test/box/abc',
    status: 'open',
    expiresAt: Date.UTC(2026, 11, 21),
    accepted: 0,
    rejected: 0,
    cardsHidden: false,
    channel: 'box.b1',
    contributions: [],
    ...overrides,
});

async function setup(
    edition: Edition = sampleEdition(),
    collect: CollectionBox = fakeCollect(),
) {
    installMemoryServices();
    const storage = new MemoryEditionStorage();
    await storage.createEdition(edition);
    const session = new EditionSession(edition, {
        storage,
        bus: new EditionBus(null, 'w'),
        now: () => 5,
        debounceMs: 1000,
    });
    const onOpenElement = vi.fn();

    function Harness() {
        const { edition: current } = useSessionSnapshot(session);

        return (
            <EditionPanel
                session={session}
                edition={current}
                resolved={resolveEdition(current)}
                interfaceLanguage="nl"
                issues={[]}
                collect={collect}
                onOpenElement={onOpenElement}
                request={null}
            />
        );
    }

    renderWithI18n(<Harness />);

    return { session, onOpenElement, user: userEvent.setup() };
}

const section = (name: string) => screen.getByRole('region', { name });

describe('EditionPanel (B145)', () => {
    it('has the sections in a fixed order, with jump links', async () => {
        await setup();

        const links = within(
            screen.getByRole('navigation', { name: 'Secties van de editie' }),
        ).getAllByRole('button');
        expect(links.map((link) => link.textContent)).toEqual([
            'Algemeen',
            'Uiterlijk',
            'Woorden',
            'Bordmaat',
        ]);
        // The section in sight is marked (vindbaarheid point 4), and a link moves the mark along.
        expect(links[0]).toHaveAttribute('aria-current', 'location');
        await userEvent.setup().click(links[2] as HTMLElement);
        expect(links[2]).toHaveAttribute('aria-current', 'location');
        expect(links[0]).not.toHaveAttribute('aria-current');
    });

    it('has no Onderdelen: what goes into the set is chosen on the print page (B198)', async () => {
        await setup();

        expect(
            screen.queryByRole('region', { name: 'Onderdelen' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('checkbox', { name: /Dobbelstenen/ }),
        ).toBeNull();
    });

    it('renames the edition and switches the subtitle off with Tonen', async () => {
        const { session, user } = await setup();
        const general = section('Algemeen');

        const name = within(general).getByLabelText('Naam');
        await user.clear(name);
        await user.type(name, 'De Kroeg');
        expect(session.edition.name).toBe('De Kroeg');

        await user.click(
            within(general).getByRole('checkbox', { name: 'Tonen' }),
        );
        expect(session.edition.elements['board_center']?.subtitle).toBe('');
        expect(within(general).getByLabelText('Ondertitel')).toBeDisabled();
    });

    describe('one currency field (B147)', () => {
        it('offers the four currencies and an own currency in one field', async () => {
            const { session, user } = await setup();
            const field = within(section('Algemeen')).getByLabelText('Munt');

            expect(
                within(field)
                    .getAllByRole('option')
                    .map((option) => option.textContent),
            ).toEqual(['€ euro', 'M', '$ dollar', '£ pond', 'Eigen munt']);

            await user.selectOptions(field, 'custom');
            // An empty own currency says it is still the euro (bug 35).
            expect(
                screen.getByText(
                    'Vul een naam of een teken in. Tot dan blijft de munt € euro.',
                ),
            ).toBeInTheDocument();
            await user.type(
                screen.getByLabelText('Naam van de munt'),
                'Kroketten',
            );
            await user.type(screen.getByLabelText('Teken'), 'K');
            expect(session.edition.elements['words.currency']).toEqual({
                name: 'Kroketten',
                text: 'K',
            });
            expect(
                screen.getByText('Zo staat een bedrag op het bord: K 200'),
            ).toBeInTheDocument();
            expect(
                screen.queryByTestId('currency-custom-empty'),
            ).not.toBeInTheDocument();
        });

        it('drops the own name and sign in one undo step when a standard currency is picked', async () => {
            const { session, user } = await setup({
                ...sampleEdition(),
                elements: {
                    'words.currency': { name: 'Kroketten', text: 'K' },
                },
            });
            const field = within(section('Algemeen')).getByLabelText('Munt');
            expect(field).toHaveValue('custom');

            await user.selectOptions(field, 'usd');
            expect(session.edition.currency).toBe('usd');
            expect(session.edition.elements['words.currency']).toBeUndefined();

            session.undo();
            expect(session.edition.elements['words.currency']).toEqual({
                name: 'Kroketten',
                text: 'K',
            });
        });
    });

    describe('Uiterlijk', () => {
        it('has no accent colour: the theme sets the accents (B203)', async () => {
            await setup();
            const look = section('Uiterlijk');

            expect(
                within(look).queryByRole('button', { name: /Pijlen/ }),
            ).not.toBeInTheDocument();
            expect(within(look).queryByText('Accentkleur')).toBeNull();
        });

        it('ignores a stored accent, and puts the group colours back with the section reset', async () => {
            const { session, user } = await setup({
                ...sampleEdition(),
                elements: {
                    theme_accent: { color: '#7B4B94' },
                    'group.red': { color: '#F7941D' },
                },
            });
            const look = section('Uiterlijk');
            expect(within(look).queryByText('#7B4B94')).toBeNull();

            await user.click(
                within(look).getByRole('button', {
                    name: 'Alles in deze sectie terug naar standaard',
                }),
            );
            expect(session.edition.elements['group.red']).toBeUndefined();
            expect(
                within(look).queryByRole('button', {
                    name: 'Alles in deze sectie terug naar standaard',
                }),
            ).not.toBeInTheDocument();
        });

        it('picks the theme as a radio group', async () => {
            const { session, user } = await setup();
            const look = section('Uiterlijk');

            await user.click(within(look).getByRole('radio', { name: 'Riso' }));
            expect(session.edition.theme).toBe('riso');
            expect(
                within(look).getByRole('radio', { name: 'Riso' }),
            ).toBeChecked();
        });
    });

    describe('Woorden', () => {
        it('has the words of the game and the bank, but no corners or tax spaces', async () => {
            await setup();
            const words = section('Woorden');

            expect(within(words).getByLabelText('Huis (één)')).toHaveAttribute(
                'placeholder',
                'huis',
            );
            expect(
                within(words).getByLabelText('De gevangenis in kaartteksten'),
            ).toHaveAttribute('placeholder', 'de gevangenis');
            expect(
                within(words).getByLabelText('Eerste stapel'),
            ).toHaveAttribute('placeholder', 'Kans');
            expect(
                within(words).getByLabelText('Naam van de bank'),
            ).toHaveAttribute('placeholder', 'Speelgeld');
            expect(
                within(words).queryByLabelText('Inkomstenbelasting'),
            ).toBeNull();
            expect(within(words).queryByText('Start')).toBeNull();
            expect(
                within(words).queryByText(/blijven zoals in het origineel/),
            ).toBeNull();
        });

        it('stores the bank name as a word of the edition (B148)', async () => {
            const { session, user } = await setup();

            await user.type(
                within(section('Woorden')).getByLabelText('Naam van de bank'),
                'Bank van de club',
            );
            expect(session.edition.elements['words.bank']).toEqual({
                name: 'Bank van de club',
            });
            expect(session.edition.elements['bank']).toBeUndefined();
        });

        it('lets Standaard wrap under a long label in a narrow column instead of leaving the panel (round 4, bug 5)', async () => {
            await setup({
                ...sampleEdition(),
                elements: {
                    'words.utility': { name: 'bron', text: 'bronnen' },
                },
            });
            const words = section('Woorden');

            for (const button of within(words).getAllByRole('button', {
                name: /Standaard/,
            })) {
                const head = button.closest('[data-field-head]');
                expect(head?.className).toContain('flex-wrap');
                expect(head?.className).toContain('min-w-0');
            }
        });

        it('puts one word back with Standaard, and the whole section with the reset', async () => {
            const { session, user } = await setup({
                ...sampleEdition(),
                elements: {
                    'words.house': { name: 'hut' },
                    'words.bank': { name: 'De club' },
                },
            });
            const words = section('Woorden');

            const standards = within(words).getAllByRole('button', {
                name: /Standaard/,
            });
            expect(standards).toHaveLength(2);
            await user.click(standards[0] as HTMLElement);
            expect(session.edition.elements['words.house']).toBeUndefined();

            await user.click(
                within(words).getByRole('button', {
                    name: 'Alles in deze sectie terug naar standaard',
                }),
            );
            expect(session.edition.elements['words.bank']).toBeUndefined();
        });
    });

    describe('Samen maken (B146)', () => {
        it('is not offered to an edition without a link: Samen maken is frozen (B202, R5-16)', async () => {
            await setup(sampleEdition(), fakeCollect());

            expect(
                screen.queryByRole('region', { name: 'Samen maken' }),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole('button', { name: 'Maak een link' }),
            ).not.toBeInTheDocument();
        });

        it('stays the last section, with its jump link, for an edition that has a link', async () => {
            await setup(sampleEdition(), fakeCollect(openBox()));

            expect(
                within(
                    screen.getByRole('navigation', {
                        name: 'Secties van de editie',
                    }),
                )
                    .getAllByRole('button')
                    .map((link) => link.textContent),
            ).toEqual([
                'Algemeen',
                'Uiterlijk',
                'Woorden',
                'Bordmaat',
                'Samen maken',
            ]);
        });

        it('keeps the jump link that was chosen lit, also when its section is too short to reach the top (Lukas)', async () => {
            const { user } = await setup(
                sampleEdition(),
                fakeCollect(openBox()),
            );
            const links = within(
                screen.getByRole('navigation', {
                    name: 'Secties van de editie',
                }),
            ).getAllByRole('button');

            await user.click(links[3] as HTMLElement);
            // The panel scrolls to the end, where the last section would count.
            const scroller = screen
                .getByRole('region', { name: 'Bordmaat' })
                .closest('.overflow-auto') as HTMLElement;
            Object.defineProperty(scroller, 'scrollHeight', { value: 400 });
            Object.defineProperty(scroller, 'clientHeight', { value: 400 });
            scroller.scrollTop = 1;
            fireEvent.scroll(scroller);

            expect(links[3]).toHaveAttribute('aria-current', 'location');
            expect(links[4]).not.toHaveAttribute('aria-current');
        });

        it('lists what waits and opens the element it is for', async () => {
            const collect = fakeCollect({
                id: 'b1',
                editionId: 'sample-edition-1',
                url: 'https://printopoly.test/box/abc',
                status: 'open',
                expiresAt: Date.UTC(2026, 11, 21),
                accepted: 0,
                rejected: 0,
                cardsHidden: false,
                channel: 'box.b1',
                contributions: [
                    {
                        id: 'c1',
                        elementKey: 'group.brown',
                        firstName: 'Anna',
                        field: 'town',
                        value: 'Heeten',
                        amount: null,
                        open: ['town'],
                        hasPhoto: false,
                        width: null,
                        height: null,
                        photoUrl: null,
                        createdAt: null,
                    },
                ],
            });
            const { user, onOpenElement } = await setup(
                sampleEdition(),
                collect,
            );
            const together = section('Samen maken');

            expect(
                within(together).getAllByRole('button', {
                    name: /Kopieer link/,
                }),
            ).toHaveLength(1);
            await user.click(
                within(together).getByRole('button', { name: 'Naar Molenweg' }),
            );
            expect(onOpenElement).toHaveBeenCalledWith('space.01');
        });

        it('asks before making a new link (B175)', async () => {
            const collect = fakeCollect(openBox());
            const { user } = await setup(sampleEdition(), collect);
            const together = section('Samen maken');

            await user.click(
                within(together).getByRole('button', { name: 'Nieuwe link' }),
            );
            expect(collect.renew).not.toHaveBeenCalled();
            const question = within(together).getByRole('alertdialog', {
                name: 'Nieuwe link',
            });
            await user.click(
                within(question).getByRole('button', {
                    name: 'Ja, nieuwe link',
                }),
            );
            expect(collect.renew).toHaveBeenCalledOnce();
        });

        it('says a closed link brings nothing new instead of "nog niets binnen"', async () => {
            await setup(
                sampleEdition(),
                fakeCollect(openBox({ status: 'closed' })),
            );

            expect(
                within(section('Samen maken')).getByText(
                    /De link is gesloten, dus er komt ook niets meer bij/,
                ),
            ).toBeInTheDocument();
        });

        it('keeps the card texts from friends on request (B176)', async () => {
            const collect = fakeCollect(openBox());
            const edition = sampleEdition({ parts: { cards: true } });
            const { user } = await setup(edition, collect);

            await user.click(
                within(section('Samen maken')).getByRole('checkbox', {
                    name: /Kaartteksten alleen voor mij/,
                }),
            );
            expect(collect.hideCards).toHaveBeenCalledWith(true);
        });

        it('has no picture for the group chat any more: that is Deel je bord in the name menu (B202)', async () => {
            await setup(sampleEdition(), fakeCollect(openBox()));

            expect(
                within(section('Samen maken')).queryByRole('button', {
                    name: 'Maak het plaatje',
                }),
            ).not.toBeInTheDocument();
        });
    });
});
