import type * as InertiaReact from '@inertiajs/react';
import {
    act,
    fireEvent,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { EditorWorkspace } from './editor-workspace';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage({ auth: { googleLoginEnabled: true } }),
}));

async function open(
    parts: Record<string, boolean> = {},
    elements: ReturnType<typeof sampleEdition>['elements'] = {},
    extra: Record<string, unknown> = {},
) {
    const services = installMemoryServices();
    const base = sampleEdition();
    const edition = {
        ...base,
        ...extra,
        parts: { ...base.parts, ...parts },
        elements: { ...base.elements, ...elements },
    };
    await services.storage.createEdition(edition);
    const session = new EditionSession(edition, {
        storage: services.storage,
        bus: new EditionBus(null, 'w'),
        now: () => Date.now(),
        debounceMs: 5,
    });

    return { session, services };
}

describe('EditorWorkspace', () => {
    it('shows the compact header, the save status with the login prompt, and the first space', async () => {
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(
            screen.getByRole('button', { name: 'Menu van Zaterdagclub' }),
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole('link', { name: 'Inloggen met Google' })[0],
        ).toBeInTheDocument();
        // No Controle and no counter while you work (B197).
        expect(
            screen.queryByRole('button', { name: /Controle/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.getAllByRole('link', { name: 'Printen' })[0],
        ).toHaveAttribute('href', '/nl/editions/sample-edition-1/print');
        expect(
            screen.getByRole('heading', { name: 'Molenweg' }),
        ).toBeInTheDocument();
    });

    it('spreads a list pasted in the search over the streets from the first one, in one undo step (R5-10)', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(
            screen.getByRole('searchbox', { name: 'Zoek een vak' }),
        );
        await user.paste('Kerkpad\r\nDorpsstraat\r\nMarkt\r\n');

        // Start keeps its name; the streets fill in order and the station between them is passed over.
        expect(session.edition.elements['space.00']).toBeUndefined();
        expect(session.edition.elements['space.01']?.name).toBe('Kerkpad');
        expect(session.edition.elements['space.03']?.name).toBe('Dorpsstraat');
        expect(session.edition.elements['space.06']?.name).toBe('Markt');
        // The search stays empty, so every row shows, and the flash says what happened.
        expect(
            screen.getByRole('searchbox', { name: 'Zoek een vak' }),
        ).toHaveValue('');
        expect(
            screen.getByText(
                '3 namen ingevuld. 2 vakken van een andere soort zijn overgeslagen.',
            ),
        ).toBeInTheDocument();

        session.undo();
        expect(session.edition.elements['space.01']).toBeUndefined();
        expect(session.edition.elements['space.06']).toBeUndefined();
    });

    it('searches for a paste of one line (R5-10)', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        const search = screen.getByRole('searchbox', { name: 'Zoek een vak' });
        await user.click(search);
        await user.paste('station');

        expect(search).toHaveValue('station');
        expect(session.edition.elements).toEqual(sampleEdition().elements);
    });

    /** A tablet upright: wide enough for two columns, and the preview folds (B173). */
    const tabletUpright = () =>
        vi.spyOn(window, 'matchMedia').mockImplementation(
            (query: string) =>
                ({
                    matches:
                        query.includes('min-width: 768px') ||
                        query.includes('max-width: 1023.98px'),
                    media: query,
                    addEventListener: () => undefined,
                    removeEventListener: () => undefined,
                }) as unknown as MediaQueryList,
        );

    it('has a tablet layout from 768 px: list beside the panel, the preview folding on top (B155)', async () => {
        const user = userEvent.setup();
        const media = tabletUpright();
        const { session } = await open();

        const { container } = renderWithI18n(
            <EditorWorkspace session={session} />,
        );
        const workspace = container.querySelector('[data-workspace]');
        const preview = container.querySelector('[data-preview]');
        const fold = screen.getByRole('button', { name: /Inklappen/ });

        // Two columns from 768 px, three from 1024 px; the phone layout only below 768 px.
        expect(workspace).toHaveClass(
            'md:grid',
            'md:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]',
            'lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(320px,380px)]',
        );
        // A phone on its side and a low tablet put the preview beside the fields (bug 2).
        expect(workspace?.className).toContain('tablet-low:grid-cols-');
        expect(fold).toHaveAttribute('aria-expanded', 'true');
        // A full 44 px target, also while it lies on the preview.
        expect(fold).toHaveClass('min-h-11');

        // The bar lies in the flow under the preview and its hints, not on top of them (bug 29).
        expect(fold).not.toHaveClass('absolute');
        expect(fold).toHaveClass('order-last');

        await user.click(fold);
        expect(preview).toHaveAttribute('data-folded', 'true');
        expect(
            screen.getByRole('button', { name: /Voorbeeld tonen/ }),
        ).toHaveAttribute('aria-expanded', 'false');
        media.mockRestore();
    });

    it('folds the preview as soon as the fields scroll, and opens it again at the top (UX 5)', async () => {
        const media = tabletUpright();
        const { session } = await open();

        const { container } = renderWithI18n(
            <EditorWorkspace session={session} />,
        );
        const preview = container.querySelector('[data-preview]');
        const fields = container.querySelector<HTMLElement>(
            'aside[data-editor-panel]',
        );
        expect(fields).not.toBeNull();
        // A long form: it stays scrollable once the preview is folded.
        Object.defineProperty(fields, 'scrollHeight', { value: 2000 });
        const scrollTo = (top: number) => {
            (fields as HTMLElement).scrollTop = top;
            fireEvent.scroll(fields as HTMLElement);
        };

        scrollTo(120);
        expect(preview).toHaveAttribute('data-folded', 'true');
        scrollTo(0);
        expect(preview).not.toHaveAttribute('data-folded');

        // Folded by hand, it stays folded at the top.
        fireEvent.click(screen.getByRole('button', { name: /Inklappen/ }));
        scrollTo(0);
        expect(preview).toHaveAttribute('data-folded', 'true');
        media.mockRestore();
    });

    it('always has all four tabs, without counts (B198, waarde-review point 10)', async () => {
        const { session } = await open(
            {},
            {
                'space.01': { name: 'Molenweg' },
                'space.03': { name: 'Kerkstraat' },
            },
        );

        renderWithI18n(<EditorWorkspace session={session} />);
        const tabs = within(
            screen.getByRole('tablist', { name: 'Onderdeel' }),
        ).getAllByRole('tab');

        expect(tabs.map((tab) => tab.textContent)).toEqual([
            'Bord',
            'Kaarten',
            'Geld',
            'Doos',
        ]);
    });

    it('shows parts that are not in the last set faded, with "niet in je set" (B198)', async () => {
        const user = userEvent.setup();
        const { session } = await open(
            {},
            {},
            {
                printSelection: {
                    set: 'home',
                    parts: ['board', 'deeds', 'cards', 'boxLid'],
                },
            },
        );

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(screen.getByRole('tab', { name: 'Doos' }));

        const lid = screen.getByRole('button', { name: /Doosdeksel/ });
        expect(lid).not.toHaveTextContent('niet in je set');
        const invitation = screen.getByRole('button', { name: /Uitnodiging/ });
        expect(invitation).toHaveTextContent('niet in je set');
        // No dice, houses and hotels or rules booklet in the editor (B200, B204).
        expect(
            screen.queryByRole('button', { name: /Dobbelstenen/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Spelregelboekje/ }),
        ).not.toBeInTheDocument();

        // A faded part still opens and can be made.
        await user.click(invitation);
        expect(
            screen.getByRole('heading', { name: 'Uitnodiging' }),
        ).toBeInTheDocument();
    });

    it('treats every part as in the set when no set was chosen yet', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(screen.getByRole('tab', { name: 'Geld' }));

        expect(screen.queryByText('niet in je set')).not.toBeInTheDocument();
    });

    it('opens the element picked in the list, with the Vak / Eigendomsbewijs switch for a street', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(screen.getByRole('button', { name: /Station Noord/ }));

        expect(
            screen.getByRole('heading', { name: 'Station Noord' }),
        ).toBeInTheDocument();
        const view = screen.getByRole('tablist', { name: 'Weergave' });
        await user.click(
            within(view).getByRole('tab', { name: 'Eigendomsbewijs' }),
        );
        expect(
            within(view).getByRole('tab', { name: 'Eigendomsbewijs' }),
        ).toHaveAttribute('aria-selected', 'true');

        await user.click(screen.getByRole('option', { name: /Start/ }));
        expect(
            screen.queryByRole('tablist', { name: 'Weergave' }),
        ).not.toBeInTheDocument();
    });

    it('has one menu in the phone top bar: the element first, then the edition (B151)', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(screen.getByRole('button', { name: /Station Noord/ }));

        // The panel head keeps its own ⋯ for the desktop; the phone has no second "Meer" button.
        expect(
            screen.getAllByRole('button', { name: 'Meer voor Station Noord' }),
        ).toHaveLength(1);
        await user.click(
            screen.getByRole('button', {
                name: 'Menu van Station Noord en Zaterdagclub',
            }),
        );
        const menu = await screen.findByRole('menu', {
            name: 'Menu van Station Noord en Zaterdagclub',
        });
        const items = within(menu)
            .getAllByRole('menuitem')
            .map((item) => item.textContent);
        expect(items[0]).toBe('Wisselen met…');
        expect(items[1]).toBe('Alle namen op het bord leegmaken');
        expect(items[2]).toMatch(/^Editie-instellingen/);
        expect(within(menu).getAllByRole('separator')[0]).toBeInTheDocument();

        await user.click(
            within(menu).getByRole('menuitem', { name: 'Wisselen met…' }),
        );
        await user.click(
            await screen.findByRole('button', { name: /Station Oost/ }),
        );
        // The status line under the panel says it, as it does for the desktop menu.
        expect(
            screen
                .getAllByRole('status')
                .some((line) =>
                    /Station Noord en Station Oost gewisseld/.test(
                        line.textContent,
                    ),
                ),
        ).toBe(true);
    });

    it('edits a name, undoes and redoes it', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        const name = screen.getByLabelText('Naam');
        await user.clear(name);
        await user.type(name, 'Het Hok');

        expect(session.edition.elements['space.01']?.name).toBe('Het Hok');
        const undo = screen.getAllByRole('button', {
            name: 'Ongedaan maken',
        })[0] as HTMLElement;
        expect(undo).toBeEnabled();

        await user.click(undo);
        expect(session.edition.elements['space.01']?.name).not.toBe('Het Hok');
        await user.click(
            screen.getAllByRole('button', {
                name: 'Opnieuw',
            })[0] as HTMLElement,
        );
        expect(session.edition.elements['space.01']?.name).toBe('Het Hok');
    });

    it('saves what was changed to the browser storage', async () => {
        const user = userEvent.setup();
        const { session, services } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.type(screen.getByLabelText('Naam'), '!');

        await waitFor(async () =>
            expect(
                (await services.storage.getEdition('sample-edition-1'))
                    ?.elements['space.01']?.name,
            ).toBe('Molenweg!'),
        );
    });

    it('opens the edition panel from the name menu, with the whole board in the middle (B144, B145)', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(
            screen.getByRole('button', { name: 'Menu van Zaterdagclub' }),
        );
        await user.click(
            await screen.findByRole('menuitem', {
                name: /Editie-instellingen/,
            }),
        );

        const panel = screen.getByRole('complementary', { name: 'Editie' });
        expect(
            within(panel).getByRole('navigation', {
                name: 'Secties van de editie',
            }),
        ).toBeInTheDocument();
        expect(
            within(panel)
                .getAllByRole('region')
                .map((section) => section.getAttribute('aria-label')),
        ).toEqual([
            'Algemeen',
            'Uiterlijk',
            'Woorden',
            'Bordmaat',
            'Samen maken',
        ]);
        expect(
            screen.getByRole('button', {
                name: /^Editie: naam, thema, woorden, bordmaat/,
            }),
        ).toHaveAttribute('aria-current', 'true');

        await user.click(within(panel).getByRole('radio', { name: /Riso/ }));
        expect(session.edition.theme).toBe('riso');

        // Back to an element: the field panel comes back.
        await user.click(screen.getByRole('button', { name: /Station Noord/ }));
        expect(
            screen.queryByRole('complementary', { name: 'Editie' }),
        ).not.toBeInTheDocument();
    });

    it('puts Editie as its stamp beside the tabs on a low screen, so the list keeps the height (designcheck ronde 5, B215)', async () => {
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        const row = screen.getByRole('button', {
            name: /^Editie: naam, thema, woorden, bordmaat/,
        });
        // The name stays for the ear and for a mouse; the visible words go on a low screen.
        expect(row).toHaveAttribute('title', 'Editie');
        expect(row).toHaveClass('low:size-12');
        expect(within(row).getByText('Editie').parentElement).toHaveClass(
            'low:hidden',
        );
        const head = row.closest('[data-nav-head]') as HTMLElement;
        expect(head).toHaveClass('low:flex-row');
        expect(within(head).getByRole('tablist')).toBeInTheDocument();
    });

    it('has no settings or words dialog, no Stijl tab and no links to them any more (B145)', async () => {
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(
            screen.queryByRole('button', {
                name: 'Onderdelen kiezen of overslaan',
            }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Woorden van je editie' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('tab', { name: /Stijl/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText('Maak je editie samen'),
        ).not.toBeInTheDocument();
    });

    it('goes straight to the field of a message from the print page (B197)', async () => {
        window.history.replaceState(
            null,
            '',
            '/nl/editor/sample-edition-1?element=space.05&field=name',
        );
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(
            screen.getByRole('heading', { name: 'Station Noord' }),
        ).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByLabelText('Naam')).toHaveFocus(),
        );
        // The address is plain again, so a reload does not jump.
        expect(window.location.search).toBe('');
    });

    it('opens the edition panel at a section from the address (vindbaarheid point 4)', async () => {
        window.history.replaceState(
            null,
            '',
            '/nl/editor/sample-edition-1?edition=words',
        );
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(
            screen.getByRole('complementary', { name: 'Editie' }),
        ).toBeInTheDocument();
        expect(window.location.search).toBe('');
    });

    it('opens the open messages from the address with ?check=1', async () => {
        window.history.replaceState(
            null,
            '',
            '/nl/editor/sample-edition-1?check=1',
        );
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(
            await screen.findByRole('dialog', { name: 'Nog even nakijken' }),
        ).toBeInTheDocument();
    });

    it('folds the small board to one line on a screen lower than 900 px (vindbaarheid point 16)', async () => {
        const user = userEvent.setup();
        const media = vi.spyOn(window, 'matchMedia').mockImplementation(
            (query: string) =>
                ({
                    matches:
                        query.includes('min-width: 768px') ||
                        query.includes('max-height: 899.98px'),
                    media: query,
                    addEventListener: () => undefined,
                    removeEventListener: () => undefined,
                }) as unknown as MediaQueryList,
        );
        const { session } = await open();

        const { container } = renderWithI18n(
            <EditorWorkspace session={session} />,
        );
        const fold = screen.getByRole('button', { name: 'Bord tonen' });
        expect(fold).toHaveAttribute('aria-expanded', 'false');
        expect(
            container.querySelector('[data-mini-board]')?.parentElement,
        ).toHaveClass('md:hidden');

        await user.click(fold);
        expect(
            screen.getByRole('button', { name: 'Bord inklappen' }),
        ).toHaveAttribute('aria-expanded', 'true');
        media.mockRestore();
    });

    it('opens the edition panel with E', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.keyboard('e');

        expect(
            screen.getByRole('complementary', { name: 'Editie' }),
        ).toBeInTheDocument();
    });

    it('asks which version to keep when another window saved something different', async () => {
        const { session, services } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        const stored = await services.storage.getEdition('sample-edition-1');
        await services.storage.applyPatch(
            'sample-edition-1',
            {
                baseRevision: stored?.revision ?? 0,
                elements: { 'card.chance.01': { text: 'Ander venster' } },
            },
            50,
        );
        services.bus.post({
            kind: 'saved',
            editionId: 'sample-edition-1',
            revision: 1,
        });
        session.apply([
            {
                key: 'space.01',
                before: undefined,
                after: { name: 'Dit venster' },
            },
        ]);
        await session.flush();

        expect(
            await screen.findByRole('dialog', {
                name: 'Twee versies van Zaterdagclub',
            }),
        ).toBeInTheDocument();
    });
    describe('Uiterlijk (B130, B145)', () => {
        async function openLook() {
            const user = userEvent.setup();
            const { session } = await open();

            renderWithI18n(<EditorWorkspace session={session} />);
            await user.click(screen.getByRole('button', { name: /^Editie:/ }));

            return { user, session };
        }

        it('lets a group colour be picked from the palette of the theme, without an accent (B203)', async () => {
            const { user, session } = await openLook();

            expect(
                screen.queryByRole('button', { name: /Pijlen.*Doosdeksel/ }),
            ).not.toBeInTheDocument();
            await user.click(
                screen.getByRole('button', { name: 'Kleur van Rood' }),
            );
            const red = screen.getByRole('group', { name: 'Rood' });
            await user.click(
                within(red).getByRole('button', { name: 'Oranje' }),
            );
            expect(session.edition.elements['group.red']?.color).toBe(
                '#F7941D',
            );
        });

        it('lets a card back take a pattern', async () => {
            const user = userEvent.setup();
            const { session } = await open();

            renderWithI18n(<EditorWorkspace session={session} />);
            await user.click(screen.getByRole('tab', { name: /Kaarten/ }));
            await user.click(
                screen.getByRole('button', { name: /Kans: achterkant/ }),
            );
            await user.click(screen.getByRole('radio', { name: 'Patroon' }));
            await user.click(screen.getByRole('radio', { name: 'Golven' }));

            expect(session.edition.elements['card_back.chance']?.pattern).toBe(
                'waves',
            );
        });
    });
});

describe('EditorWorkspace undo and redo (UX 7, ronde 3)', () => {
    it('shows the element that undo changed and says what came back', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        act(() => {
            session.apply([
                {
                    key: 'space.03',
                    before: undefined,
                    after: { name: 'De Opel van papa' },
                },
            ]);
        });
        // Somewhere else in the editor when the person undoes.
        await user.click(screen.getByRole('button', { name: /Station Noord/ }));
        expect(
            screen.getByRole('heading', { name: 'Station Noord' }),
        ).toBeInTheDocument();

        act(() => {
            session.undo();
        });

        expect(
            screen.getByRole('heading', { name: 'Veldweg' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Ongedaan: naam van Veldweg.'),
        ).toBeInTheDocument();

        act(() => {
            session.redo();
        });
        expect(
            screen.getByText('Opnieuw gedaan: naam van De Opel van papa.'),
        ).toBeInTheDocument();
    });
});
