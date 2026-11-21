import type * as InertiaReact from '@inertiajs/react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { installMemoryServices } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import EditionsCreate from './create';
import EditionsIndex from './index';

const state = vi.hoisted(() => ({
    auth: { user: null as null | { name: string }, googleLoginEnabled: false },
    visit: vi.fn(),
}));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage({ auth: state.auth as never }),
    router: { visit: state.visit },
    Head: () => null,
}));

const input = {
    theme: 'classic' as const,
    language: 'nl' as const,
    boardProfile: undefined as never,
};

async function seed(names: string[]) {
    const services = installMemoryServices();
    const { DEFAULT_BOARD_PROFILE } = await import('@/lib/print/board');
    for (const name of names) {
        await services.repository.create({
            ...input,
            name,
            boardProfile: DEFAULT_BOARD_PROFILE,
        });
    }

    return services;
}

describe('Mijn edities', () => {
    beforeEach(() => {
        state.auth = { user: null, googleLoginEnabled: true };
        state.visit.mockReset();
    });

    it('shows the empty state and no banner without editions', async () => {
        installMemoryServices();
        renderWithI18n(<EditionsIndex />);

        expect(
            await screen.findByText('Je hebt nog geen editie'),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/staan alleen in deze browser/),
        ).not.toBeInTheDocument();
        expect(
            screen.getAllByRole('link', { name: 'Nieuwe editie' })[0],
        ).toHaveAttribute('href', '/nl/editions/new');
    });

    it('lists the editions with a board thumbnail and a banner to log in', async () => {
        await seed(['Zaterdagclub', 'Familie']);
        renderWithI18n(<EditionsIndex />);

        expect(
            await screen.findByRole('heading', { name: 'Zaterdagclub' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Familie' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('img', { name: /Bord van/ })).toHaveLength(
            2,
        );
        expect(
            screen.getByText(/Je 2 edities staan alleen in deze browser/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Inloggen met Google' }),
        ).toBeInTheDocument();
    });

    it('does not show the banner to someone who is logged in', async () => {
        state.auth = { user: { name: 'Niek' }, googleLoginEnabled: true };
        await seed(['Zaterdagclub']);
        renderWithI18n(<EditionsIndex />);

        await screen.findByRole('heading', { name: 'Zaterdagclub' });

        expect(
            screen.queryByText(/staan alleen in deze browser/),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText('Edities in je account: 1'),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/Edities in deze browser/),
        ).not.toBeInTheDocument();
    });

    it('says "in deze browser" in the heading when logged out', async () => {
        await seed(['Zaterdagclub']);
        renderWithI18n(<EditionsIndex />);

        expect(
            await screen.findByText('Edities in deze browser: 1'),
        ).toBeInTheDocument();
    });

    it('renames from the menu', async () => {
        const user = userEvent.setup();
        const { repository } = await seed(['Zaterdagclub']);

        renderWithI18n(<EditionsIndex />);
        await user.click(
            await screen.findByRole('button', {
                name: 'Meer opties voor Zaterdagclub',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Naam wijzigen' }),
        );
        const field = await screen.findByLabelText('Naam');
        await user.clear(field);
        await user.type(field, 'Vrijdagclub');
        await user.click(screen.getByRole('button', { name: 'Opslaan' }));

        expect(
            await screen.findByRole('heading', { name: 'Vrijdagclub' }),
        ).toBeInTheDocument();
        expect((await repository.list())[0]?.name).toBe('Vrijdagclub');
        // The board in the thumbnail carries the edition name, so it must be drawn again.
        const thumbnail = await screen.findByRole('img', {
            name: /Vrijdagclub/,
        });
        await waitFor(() => expect(thumbnail).toHaveTextContent('Vrijdagclub'));
    });

    it('duplicates from the card, where the action is in sight (UX 9)', async () => {
        const user = userEvent.setup();
        const { repository } = await seed(['Zaterdagclub']);

        renderWithI18n(<EditionsIndex />);
        await user.click(
            await screen.findByRole('button', {
                name: 'Dupliceer Zaterdagclub als nieuwe editie',
            }),
        );

        await waitFor(async () =>
            expect(await repository.list()).toHaveLength(2),
        );
        expect(
            await screen.findByRole('heading', {
                name: 'Zaterdagclub (kopie)',
            }),
        ).toBeInTheDocument();
    });

    it('asks for confirmation with the name before deleting, and can be cancelled', async () => {
        const user = userEvent.setup();
        const { repository } = await seed(['Zaterdagclub']);

        renderWithI18n(<EditionsIndex />);
        await user.click(
            await screen.findByRole('button', {
                name: 'Meer opties voor Zaterdagclub',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Verwijderen' }),
        );

        const dialog = await screen.findByRole('dialog', {
            name: 'Zaterdagclub verwijderen?',
        });
        expect(dialog).toHaveTextContent('kan dat niet ongedaan worden');

        await user.click(screen.getByRole('button', { name: 'Annuleren' }));
        expect(await repository.list()).toHaveLength(1);

        await user.click(
            screen.getByRole('button', {
                name: 'Meer opties voor Zaterdagclub',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Verwijderen' }),
        );
        await user.click(
            await screen.findByRole('button', { name: 'Verwijderen' }),
        );

        await waitFor(async () =>
            expect(await repository.list()).toHaveLength(0),
        );
        expect(
            await screen.findByText('Je hebt nog geen editie'),
        ).toBeInTheDocument();
    });
});

describe('Nieuwe editie', () => {
    beforeEach(() => state.visit.mockReset());

    it('starts with everything filled in and the theme and parts folded into one line each', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        expect(screen.getByLabelText('Naam')).toHaveValue('Onze editie');
        expect(screen.getByLabelText('Taal van bord en kaarten')).toHaveValue(
            'nl',
        );
        expect(screen.getByRole('button', { name: /Munt/ })).toHaveTextContent(
            '€ euro',
        );

        const theme = screen.getByRole('button', { name: /Thema/ });
        const parts = screen.getByRole('button', { name: /Onderdelen/ });
        expect(theme).toHaveTextContent('Klassiek');
        expect(theme).toHaveAttribute('aria-expanded', 'false');
        expect(parts).toHaveTextContent(
            'bord, eigendomsbewijzen, Kans en Algemeen Fonds',
        );
        expect(
            screen.queryByRole('radio', { name: /Klassiek/ }),
        ).not.toBeInTheDocument();

        await user.click(theme);
        expect(screen.getByRole('radio', { name: /Klassiek/ })).toBeChecked();

        await user.click(parts);
        expect(
            screen.getByRole('checkbox', { name: /Eigendomsbewijzen/ }),
        ).toBeChecked();
        expect(
            screen.getByRole('checkbox', { name: /Kans en Algemeen Fonds/i }),
        ).toBeChecked();
        expect(
            screen.getByRole('checkbox', { name: /Speelgeld/ }),
        ).not.toBeChecked();
        expect(
            screen.getByRole('checkbox', { name: /Pionnen/ }),
        ).not.toBeChecked();
        expect(screen.getByRole('checkbox', { name: /Bord/ })).toBeDisabled();
        // The board size is the last thing in the parts block.
        expect(
            screen.getByRole('radio', { name: /Modern vierkant/ }),
        ).toBeChecked();
    });

    it('lets the currency follow the language: pound in English (B154)', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        const currency = screen.getByRole('button', { name: /Munt/ });
        await user.selectOptions(
            screen.getByLabelText('Taal van bord en kaarten'),
            'en',
        );
        expect(currency).toHaveTextContent('£ pond');

        await user.selectOptions(
            screen.getByLabelText('Taal van bord en kaarten'),
            'nl',
        );
        expect(currency).toHaveTextContent('€ euro');
    });

    it('makes the edition in the currency the page shows, also after a language switch (bug 29)', async () => {
        const user = userEvent.setup();

        const services = installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        await user.selectOptions(
            screen.getByLabelText('Taal van bord en kaarten'),
            'en',
        );
        await user.click(screen.getByRole('button', { name: /Munt/ }));
        await user.click(screen.getByRole('radio', { name: /€ euro/ }));
        expect(screen.getByRole('button', { name: /Munt/ })).toHaveTextContent(
            '€ euro',
        );
        // A currency the visitor picked stays when the language changes again.
        await user.selectOptions(
            screen.getByLabelText('Taal van bord en kaarten'),
            'nl',
        );
        await user.selectOptions(
            screen.getByLabelText('Taal van bord en kaarten'),
            'en',
        );
        expect(screen.getByRole('button', { name: /Munt/ })).toHaveTextContent(
            '€ euro',
        );

        await user.click(screen.getByRole('button', { name: 'Editie maken' }));
        await waitFor(() => expect(state.visit).toHaveBeenCalled());
        const [summary] = await services.repository.list();
        const edition = await services.repository.get(summary?.id ?? '');
        expect(edition?.language).toBe('en');
        expect(edition?.currency).toBe('eur');
    });

    it('makes a blank English edition in the theme the page shows (bug 42)', async () => {
        const user = userEvent.setup();

        const services = installMemoryServices();
        renderWithI18n(<EditionsCreate template="bachelor" />);
        // A template in Riso first, then back to blank, then English.
        expect(screen.getByRole('button', { name: /Thema/ })).toHaveTextContent(
            'Riso',
        );
        await user.click(screen.getByRole('radio', { name: /^Leeg/ }));
        await user.selectOptions(
            screen.getByLabelText('Taal van bord en kaarten'),
            'en',
        );
        expect(screen.getByRole('button', { name: /Thema/ })).toHaveTextContent(
            'Klassiek',
        );

        await user.click(screen.getByRole('button', { name: 'Editie maken' }));
        await waitFor(() => expect(state.visit).toHaveBeenCalled());
        const [summary] = await services.repository.list();
        const edition = await services.repository.get(summary?.id ?? '');
        expect(edition?.theme).toBe('classic');
        expect(edition?.currency).toBe('gbp');
        expect(edition?.template).toBeUndefined();
    });

    it('expands the board size fields for "Andere maat" and rejects sizes that do not fit', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        expect(
            screen.queryByLabelText(/A: buitenmaat/),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Onderdelen/ }));
        await user.click(screen.getByRole('radio', { name: /Andere maat/ }));
        const outer = screen.getByLabelText(/A: buitenmaat/);
        await user.clear(outer);
        await user.type(outer, '100');

        const alert = await screen.findByRole('alert');
        expect(alert).toBeInTheDocument();
        for (const field of [
            outer,
            screen.getByLabelText(/B: /),
            screen.getByLabelText(/C: /),
        ]) {
            expect(field).toHaveAttribute('aria-invalid', 'true');
            expect(field).toHaveAttribute('aria-describedby', alert.id);
        }
    });

    it('creates the edition in this browser and opens the editor', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();

        renderWithI18n(<EditionsCreate />);
        const name = screen.getByLabelText('Naam');
        await user.clear(name);
        await user.type(name, 'Zaterdagclub');
        await user.click(screen.getByRole('button', { name: /Thema/ }));
        await user.click(screen.getByRole('radio', { name: /Riso/ }));
        await user.click(screen.getByRole('button', { name: /Onderdelen/ }));
        await user.click(screen.getByRole('checkbox', { name: /Speelgeld/ }));
        await user.click(screen.getByRole('button', { name: 'Editie maken' }));

        await waitFor(() => expect(state.visit).toHaveBeenCalled());
        const [created] = await repository.list();
        expect(created?.name).toBe('Zaterdagclub');
        const edition = await repository.get(created?.id ?? '');
        expect(edition).toMatchObject({
            theme: 'riso',
            language: 'nl',
            currency: 'eur',
            parts: { money: true, deeds: true, pawns: false },
        });
        expect(state.visit.mock.calls[0]?.[0]).toMatchObject({
            url: `/nl/editor/${created?.id ?? ''}`,
        });
    });

    it('does not submit without a name', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        await user.clear(screen.getByLabelText('Naam'));

        expect(
            screen.getByRole('button', { name: 'Editie maken' }),
        ).toBeDisabled();
    });
});
