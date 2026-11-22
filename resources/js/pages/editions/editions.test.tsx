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
            screen.queryByText(/staan in deze browser, op dit apparaat/),
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
        // Calm and still true (R5-23): where they are, when they would go, and what Google adds.
        const banner = screen.getByText(
            /Je 2 edities staan in deze browser, op dit apparaat/,
        );
        expect(banner).toHaveTextContent(
            'tenzij je de sitegegevens van de browser wist',
        );
        expect(banner).not.toHaveTextContent(/kwijt/);
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
            screen.queryByText(/staan in deze browser, op dit apparaat/),
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
        // The copy opens in the editor with its name ready to retype, instead of a second card that looks the same.
        const copy = (await repository.list()).find(
            (edition) => edition.name === 'Zaterdagclub (kopie)',
        );
        await waitFor(() =>
            expect(state.visit).toHaveBeenCalledWith(
                `/nl/editor/${copy?.id ?? ''}?edition=general&field=edition.name`,
            ),
        );
    });

    it('duplicates from the ⋯ menu of the card too (vindbaarheid 1.3)', async () => {
        const user = userEvent.setup();
        const { repository } = await seed(['Zaterdagclub']);

        renderWithI18n(<EditionsIndex />);
        await user.click(
            await screen.findByRole('button', {
                name: 'Meer opties voor Zaterdagclub',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Dupliceren' }),
        );

        await waitFor(async () =>
            expect(await repository.list()).toHaveLength(2),
        );
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

    const language = (name: 'Nederlands' | 'English') =>
        screen.getByRole('radio', { name });

    it('starts with everything filled in, the theme and currency folded into one line each and no parts (B198)', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        expect(screen.getByLabelText('Naam van je editie')).toHaveValue(
            'Onze editie',
        );
        expect(language('Nederlands')).toBeChecked();
        expect(screen.getByRole('button', { name: /Munt/ })).toHaveTextContent(
            '€ euro',
        );

        const theme = screen.getByRole('button', { name: /Thema/ });
        expect(theme).toHaveTextContent('Klassiek');
        expect(theme).toHaveAttribute('aria-expanded', 'false');
        expect(
            screen.queryByRole('radio', { name: /Klassiek/ }),
        ).not.toBeInTheDocument();
        // Parts and the board size are chosen on the print page and in the editor (B198).
        expect(
            screen.queryByRole('button', { name: /Onderdelen/ }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('radio', { name: /Modern vierkant/ }),
        ).not.toBeInTheDocument();

        await user.click(theme);
        expect(theme).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('radio', { name: /Klassiek/ })).toBeChecked();
    });

    it('puts the name next to the button, without autofocus, so the first Tab reaches the skip link (vindbaarheid 9)', () => {
        installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        const card = screen.getByRole('complementary', { name: 'Je editie' });
        const name = screen.getByLabelText('Naam van je editie');
        expect(card).toContainElement(name);
        expect(card).toContainElement(
            screen.getByRole('button', { name: 'Editie maken' }),
        );
        expect(name).not.toHaveFocus();
    });

    it('lets the currency follow the language: pound in English (B154)', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        const currency = screen.getByRole('button', { name: /Munt/ });
        await user.click(language('English'));
        expect(currency).toHaveTextContent('£ pond');

        await user.click(language('Nederlands'));
        expect(currency).toHaveTextContent('€ euro');
    });

    it('makes the edition in the currency the page shows, also after a language switch (bug 29)', async () => {
        const user = userEvent.setup();

        const services = installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        await user.click(language('English'));
        await user.click(screen.getByRole('button', { name: /Munt/ }));
        await user.click(screen.getByRole('radio', { name: /€ euro/ }));
        expect(screen.getByRole('button', { name: /Munt/ })).toHaveTextContent(
            '€ euro',
        );
        // A currency the visitor picked stays when the language changes again.
        await user.click(language('Nederlands'));
        await user.click(language('English'));
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
        renderWithI18n(<EditionsCreate template="party" />);
        // A template in Riso first, then back to blank, then English.
        expect(screen.getByRole('button', { name: /Thema/ })).toHaveTextContent(
            'Riso',
        );
        await user.click(screen.getByRole('radio', { name: /^Leeg/ }));
        await user.click(language('English'));
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

    it('starts blank from a link to a template that is no longer offered (B201)', () => {
        installMemoryServices();
        renderWithI18n(<EditionsCreate template="kidsparty" />);

        expect(screen.getByRole('radio', { name: /^Leeg/ })).toBeChecked();
        expect(screen.getByLabelText('Naam van je editie')).toHaveValue(
            'Onze editie',
        );
    });

    it('creates the edition in this browser and opens the editor', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();

        renderWithI18n(<EditionsCreate />);
        const name = screen.getByLabelText('Naam van je editie');
        await user.clear(name);
        await user.type(name, 'Zaterdagclub');
        await user.click(screen.getByRole('button', { name: /Thema/ }));
        await user.click(screen.getByRole('radio', { name: /Riso/ }));
        await user.click(screen.getByRole('button', { name: 'Editie maken' }));

        await waitFor(() => expect(state.visit).toHaveBeenCalled());
        const [created] = await repository.list();
        expect(created?.name).toBe('Zaterdagclub');
        const edition = await repository.get(created?.id ?? '');
        expect(edition).toMatchObject({
            theme: 'riso',
            language: 'nl',
            currency: 'eur',
        });
        expect(state.visit.mock.calls[0]?.[0]).toMatchObject({
            url: `/nl/editor/${created?.id ?? ''}`,
        });
    });

    it('does not submit without a name', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        await user.clear(screen.getByLabelText('Naam van je editie'));

        expect(
            screen.getByRole('button', { name: 'Editie maken' }),
        ).toBeDisabled();
    });
});
