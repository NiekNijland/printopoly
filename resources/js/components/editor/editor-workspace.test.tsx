import type * as InertiaReact from '@inertiajs/react';
import { act, screen, waitFor, within } from '@testing-library/react';
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

async function open(parts: Record<string, boolean> = {}) {
    const services = installMemoryServices();
    const base = sampleEdition();
    const edition = { ...base, parts: { ...base.parts, ...parts } };
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
            screen.getByRole('button', {
                name: 'Instellingen van Zaterdagclub',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole('link', { name: 'Inloggen met Google' })[0],
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole('button', { name: 'Controle: 0' })[0],
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole('link', { name: 'Printen' })[0],
        ).toHaveAttribute('href', '/nl/editions/sample-edition-1/print');
        expect(
            screen.getByRole('heading', { name: 'Molenweg' }),
        ).toBeInTheDocument();
    });

    it('only has tabs for the chosen parts, with counts', async () => {
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        const tabs = within(
            screen.getByRole('tablist', { name: 'Onderdeel' }),
        ).getAllByRole('tab');

        expect(tabs.map((tab) => tab.textContent)).toEqual([
            'Bord0/41',
            'Kaarten0/35',
            'Stijl0/1',
        ]);
        expect(
            screen.queryByRole('tab', { name: /Geld/ }),
        ).not.toBeInTheDocument();
    });

    it('shows Geld and Doos en extras when those parts are on', async () => {
        const { session } = await open({ money: true, pawns: true });

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(screen.getByRole('tab', { name: /Geld/ })).toBeInTheDocument();
        expect(
            screen.getByRole('tab', { name: /Doos en extra/ }),
        ).toBeInTheDocument();
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

    it('opens the settings from the name, with a sentence about what changed', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(
            screen.getByRole('button', {
                name: 'Instellingen van Zaterdagclub',
            }),
        );
        const dialog = await screen.findByRole('dialog');
        await user.click(within(dialog).getByRole('radio', { name: /Riso/ }));

        expect(session.edition.theme).toBe('riso');
        expect(within(dialog).getByRole('status')).toHaveTextContent(/Riso/);
    });

    it('turns a part on from the settings and shows its tab', async () => {
        const user = userEvent.setup();
        const { session } = await open();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(
            screen.getByRole('button', {
                name: 'Onderdelen kiezen of overslaan',
            }),
        );
        const dialog = await screen.findByRole('dialog');
        await user.click(
            within(dialog).getByRole('checkbox', { name: /Speelgeld/ }),
        );
        await act(() => Promise.resolve());

        expect(
            screen.getByRole('tab', { name: /Geld/, hidden: true }),
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
    describe('Stijl (B130)', () => {
        it('lets the accent and a group colour be picked from the palette of the theme', async () => {
            const user = userEvent.setup();
            const { session } = await open();

            renderWithI18n(<EditorWorkspace session={session} />);
            await user.click(screen.getByRole('tab', { name: /Stijl/ }));
            await user.click(screen.getByRole('button', { name: /Kleuren/ }));

            const accent = screen.getByRole('group', { name: 'Accentkleur' });
            await user.click(
                within(accent).getByRole('button', { name: 'Paars' }),
            );
            expect(session.edition.elements['theme_accent']?.color).toBe(
                '#7B4B94',
            );

            const red = screen.getAllByRole('group', { name: 'Rood' })[0];
            await user.click(
                within(red as HTMLElement).getByRole('button', {
                    name: 'Oranje',
                }),
            );
            expect(session.edition.elements['group.red']?.color).toBe(
                '#F7941D',
            );
        });

        it('tones a neon colour down at once and says so', async () => {
            const user = userEvent.setup();
            const { session } = await open();

            renderWithI18n(<EditorWorkspace session={session} />);
            await user.click(screen.getByRole('tab', { name: /Stijl/ }));
            await user.click(screen.getByRole('button', { name: /Kleuren/ }));
            const hex = screen.getByRole('textbox', {
                name: 'Accentkleur: hex',
            });
            await user.clear(hex);
            await user.type(hex, '#00FF00');

            const stored = session.edition.elements['theme_accent']?.color;
            expect(stored).toBeDefined();
            expect(stored).not.toBe('#00FF00');
            expect(
                screen.getByText(/feller dan drukinkt kan maken/),
            ).toBeInTheDocument();
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
            await user.click(screen.getByRole('button', { name: 'Golven' }));

            expect(session.edition.elements['card_back.chance']?.pattern).toBe(
                'waves',
            );
        });
    });
});
