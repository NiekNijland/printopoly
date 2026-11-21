import type * as InertiaReact from '@inertiajs/react';
import { screen, within } from '@testing-library/react';
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
            'Onderdelen',
            'Bord',
            'Samen maken',
        ]);
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
        it('shows the colours the board really uses when there is no own accent (bug 5)', async () => {
            await setup();
            const look = section('Uiterlijk');

            const accent = within(look).getByRole('button', {
                name: /Pijlen.*Doosdeksel.*van het thema/,
            });
            expect(accent).toBeInTheDocument();
            expect(
                within(look).queryByRole('button', { name: /Standaard/ }),
            ).not.toBeInTheDocument();
        });

        it('offers Standaard once there is an own accent, and the section reset', async () => {
            const { session, user } = await setup({
                ...sampleEdition(),
                elements: {
                    theme_accent: { color: '#7B4B94' },
                    'group.red': { color: '#F7941D' },
                },
            });
            const look = section('Uiterlijk');
            expect(within(look).getByText('#7B4B94')).toBeInTheDocument();

            await user.click(
                within(look).getByRole('button', {
                    name: 'Alles in deze sectie terug naar standaard',
                }),
            );
            expect(session.edition.elements['theme_accent']).toBeUndefined();
            expect(session.edition.elements['group.red']).toBeUndefined();
            expect(
                within(look).queryByRole('button', {
                    name: 'Alles in deze sectie terug naar standaard',
                }),
            ).not.toBeInTheDocument();
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

    it('groups the parts in Het spel and Extra drukwerk', async () => {
        const { session, user } = await setup();
        const parts = section('Onderdelen');

        expect(
            within(parts)
                .getAllByRole('group')
                .map((group) => group.querySelector('legend')?.textContent),
        ).toEqual(['Het spel', 'Extra drukwerk']);
        await user.click(
            within(parts).getByRole('checkbox', { name: /Dobbelstenen/ }),
        );
        expect(session.edition.parts.dice).toBe(true);
    });

    it('chooses how much play money to print, right under Speelgeld (B156)', async () => {
        const base = sampleEdition();
        const { session, user } = await setup({
            ...base,
            parts: { ...base.parts, money: true },
        });
        const parts = section('Onderdelen');

        expect(
            within(parts).getByText(
                'Per set: thuis 2 tot 4 spelers, drukkerij de volledige bank',
            ),
        ).toBeVisible();
        await user.click(
            within(parts).getByRole('radio', { name: '5 tot 8 spelers' }),
        );
        expect(session.edition.moneyAmount).toBe('eight');

        await user.click(
            within(parts).getByRole('button', { name: /Standaard/ }),
        );
        expect(session.edition.moneyAmount).toBeUndefined();
    });

    describe('Samen maken (B146)', () => {
        it('starts a link with the one primary button', async () => {
            const collect = fakeCollect();
            const { user } = await setup(sampleEdition(), collect);

            await user.click(
                within(section('Samen maken')).getByRole('button', {
                    name: 'Maak een link',
                }),
            );
            expect(collect.start).toHaveBeenCalledOnce();
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

        it('waits for the picture from the server and drops the red line at the next action (bug 1)', async () => {
            const answers = [
                new Response(JSON.stringify({ id: 'x'.repeat(40) }), {
                    status: 202,
                }),
                new Response(
                    JSON.stringify({ status: 'failed', message: 'Mis.' }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
            ];
            vi.stubGlobal(
                'fetch',
                vi.fn(() => Promise.resolve(answers.shift())),
            );
            const { user } = await setup(
                sampleEdition(),
                fakeCollect(openBox()),
            );
            const together = section('Samen maken');

            await user.click(
                within(together).getByRole('button', {
                    name: 'Maak het plaatje',
                }),
            );
            expect(
                await within(together).findByText(
                    'Het plaatje maken lukte niet. Probeer het zo nog eens.',
                    {},
                    { timeout: 3000 },
                ),
            ).toBeInTheDocument();

            await user.click(
                within(together).getByRole('button', { name: 'Nieuwe link' }),
            );
            expect(
                within(together).queryByText(
                    'Het plaatje maken lukte niet. Probeer het zo nog eens.',
                ),
            ).not.toBeInTheDocument();
            vi.unstubAllGlobals();
        });
    });
});
