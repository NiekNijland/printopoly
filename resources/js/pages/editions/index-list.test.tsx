import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setEnvironment } from '@/features/edition/editor/testing/services';
import { describeSaveStatus } from '@/features/edition/save-status';
import { installMemoryServices } from '@/testing/editions';
import { setPage, visit } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import EditionsIndex from './index';

const input = {
    theme: 'classic' as const,
    language: 'nl' as const,
};

const seed = async (names: string[]) => {
    const services = installMemoryServices();
    const { DEFAULT_BOARD_PROFILE } = await import('@/lib/render/print-board');
    for (const name of names) {
        await services.repository.create({
            ...input,
            name,
            boardProfile: DEFAULT_BOARD_PROFILE,
        });
    }

    return services;
};

describe('Mijn edities', () => {
    beforeEach(() => {
        setPage(fakePage({ auth: { googleLoginEnabled: true } }));
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

    it('says what Safari does in the same words as the editor (R6 Sara, Kees)', async () => {
        setEnvironment({
            privateWindow: false,
            safariEvictionRisk: true,
            persisted: false,
            storage: null,
        });
        await seed(['Kerst bij de Jansens']);
        renderWithI18n(<EditionsIndex />);

        const banner = await screen.findByText(
            /Safari bewaart hem tot 7 dagen na je laatste bezoek/,
        );
        expect(banner).not.toHaveTextContent('sitegegevens');
        // The save line of the editor says the same.
        expect(
            describeSaveStatus(
                { kind: 'safari-eviction', warning: false },
                'nl',
            ).message,
        ).toContain('Safari bewaart het tot 7 dagen na je laatste bezoek');
        setEnvironment(null);
    });

    it('does not show the banner to someone who is logged in', async () => {
        setPage(
            fakePage({
                auth: {
                    user: { id: 'u1', name: 'Niek', email: 'niek@example.com' },
                    googleLoginEnabled: true,
                },
            }),
        );
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
            expect(visit).toHaveBeenCalledWith(
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
