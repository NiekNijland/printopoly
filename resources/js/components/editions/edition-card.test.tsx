import type * as InertiaReact from '@inertiajs/react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { EditionStatus } from '@/hooks/use-edition-status';
import type { AccountActions } from '@/lib/editor/account-actions';
import type { PrintedState } from '@/lib/print/printed';
import { installMemoryServices } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { EditionCard } from './edition-card';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage(),
    // Dupliceren opens the copy in the editor.
    router: { visit: vi.fn() },
}));

function fakeAccount(): AccountActions {
    return {
        rename: vi.fn(() => Promise.resolve()),
        copy: vi.fn(() => Promise.resolve()),
        remove: vi.fn(() => Promise.resolve()),
    };
}

async function seedCard(
    account: AccountActions | null,
    inAccount: boolean,
    status?: EditionStatus,
    customizedPercent?: number,
    printed?: PrintedState,
) {
    const { repository } = installMemoryServices();
    const { DEFAULT_BOARD_PROFILE } = await import('@/lib/print/board');
    await repository.create({
        name: 'Zaterdagclub',
        language: 'nl',
        theme: 'classic',
        boardProfile: DEFAULT_BOARD_PROFILE,
    });
    const [summary] = await repository.list();
    if (summary === undefined) {
        throw new Error('seed failed');
    }
    const onChanged = vi.fn();
    renderWithI18n(
        <ul>
            <EditionCard
                edition={
                    customizedPercent === undefined
                        ? summary
                        : { ...summary, customizedPercent }
                }
                onChanged={onChanged}
                account={account}
                inAccount={inAccount}
                status={status}
                printed={printed}
            />
        </ul>,
    );

    return { repository, summary, onChanged };
}

async function openMenuItem(name: string) {
    const user = userEvent.setup();
    await user.click(
        await screen.findByRole('button', {
            name: 'Meer opties voor Zaterdagclub',
        }),
    );
    await user.click(await screen.findByRole('menuitem', { name }));

    return user;
}

describe('EditionCard counts and order', () => {
    it('says which share is your own, "40% aangepast" (Niek, 22 nov)', async () => {
        await seedCard(null, false, undefined, 40);

        const card = screen.getByRole('listitem');
        expect(card).toHaveTextContent('40% aangepast · bewerkt');
        expect(card).not.toHaveTextContent('Aangepast:');
    });

    it('leaves the count out for an edition nobody changed', async () => {
        await seedCard(null, false, undefined, 0);

        const card = screen.getByRole('listitem');
        expect(card).toHaveTextContent('Bewerkt');
        expect(card).not.toHaveTextContent(/aangepast/i);
    });

    it('reaches Openen with Tab before the menu of the card', async () => {
        await seedCard(null, false);
        const user = userEvent.setup();

        await user.tab();
        expect(document.activeElement).toHaveAccessibleName(
            'Zaterdagclub openen',
        );
        await user.tab();
        await user.tab();
        await user.tab();
        expect(document.activeElement).toHaveAccessibleName(
            'Meer opties voor Zaterdagclub',
        );
    });
});

describe('EditionCard with an account', () => {
    it('says where the edition is kept', async () => {
        await seedCard(fakeAccount(), true);

        expect(screen.getByText('In je account')).toBeInTheDocument();
        expect(screen.queryByText('In deze browser')).not.toBeInTheDocument();
    });

    it('leaves the theme out, with no loose band on top of the card (bug 41, Niek 22 nov)', async () => {
        await seedCard(fakeAccount(), true);

        const card = screen.getByRole('listitem');
        expect(within(card).queryByText('Klassiek')).not.toBeInTheDocument();
        // The first thing in the card is the board, not a coloured strip that reads as a cut-off card.
        expect(card.firstElementChild?.tagName).toBe('A');
    });

    it('deletes in the account too, and warns that it is gone everywhere', async () => {
        const account = fakeAccount();
        const { repository, summary } = await seedCard(account, true);

        const user = await openMenuItem('Verwijderen');
        expect(await screen.findByRole('dialog')).toHaveTextContent(
            'staat in je account',
        );
        await user.click(
            await screen.findByRole('button', { name: 'Verwijderen' }),
        );

        await waitFor(async () =>
            expect(await repository.list()).toHaveLength(0),
        );
        expect(account.remove).toHaveBeenCalledWith(summary.id);
    });

    it('keeps the edition here when the account cannot delete it, so it does not come back', async () => {
        const account = fakeAccount();
        vi.mocked(account.remove).mockRejectedValue(new Error('offline'));
        const { repository } = await seedCard(account, true);

        const user = await openMenuItem('Verwijderen');
        await user.click(
            await screen.findByRole('button', { name: 'Verwijderen' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Dat is niet gelukt',
        );
        expect(await repository.list()).toHaveLength(1);
    });

    it('renames and copies in the account too', async () => {
        const account = fakeAccount();
        const { repository, summary } = await seedCard(account, true);

        const user = await openMenuItem('Naam wijzigen');
        const field = await screen.findByLabelText('Naam');
        await user.clear(field);
        await user.type(field, 'Vrijdagclub');
        await user.click(screen.getByRole('button', { name: 'Opslaan' }));
        await waitFor(() =>
            expect(account.rename).toHaveBeenCalledWith(
                summary.id,
                'Vrijdagclub',
            ),
        );

        await user.click(
            await screen.findByRole('button', {
                name: 'Dupliceer Zaterdagclub als nieuwe editie',
            }),
        );
        await waitFor(async () =>
            expect(await repository.list()).toHaveLength(2),
        );
        expect(account.copy).toHaveBeenCalledWith(
            summary.id,
            expect.objectContaining({ name: 'Vrijdagclub (kopie)' }),
        );
    });
});

describe('EditionCard status lines and actions (B95, B128)', () => {
    const NOV_28 = Date.UTC(2026, 10, 28, 12);
    const none = { readyUntil: null, outdated: false };

    it('says nothing when nothing waits, and offers Openen and Printen', async () => {
        const { summary } = await seedCard(null, false);

        expect(
            screen.queryByRole('list', { name: 'Wat er klaarstaat' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Zaterdagclub openen' }),
        ).toHaveAttribute('href', `/nl/editor/${summary.id}`);
        expect(
            screen.getByRole('link', { name: 'Zaterdagclub printen' }),
        ).toHaveAttribute('href', `/nl/editions/${summary.id}/print`);
    });

    it('says whether the edition was printed, also when the files are gone (R6 Kees)', async () => {
        await seedCard(null, false, undefined, undefined, { kind: 'never' });
        expect(
            screen.getByRole('list', { name: 'Wat er klaarstaat' }),
        ).toHaveTextContent('Nog niet geprint');
    });

    it('says when it was printed, and whether it changed since', async () => {
        await seedCard(null, false, undefined, undefined, {
            kind: 'changed',
            at: NOV_28,
        });
        expect(
            screen.getByRole('list', { name: 'Wat er klaarstaat' }),
        ).toHaveTextContent('Geprint op 28 nov, daarna aangepast');
    });

    it('leaves the printed line out while a set is ready: that line says more', async () => {
        await seedCard(
            null,
            false,
            {
                contributions: 0,
                boxUntil: null,
                printer: none,
                home: { readyUntil: NOV_28, outdated: false },
            },
            undefined,
            { kind: 'printed', at: NOV_28 },
        );
        const list = screen.getByRole('list', { name: 'Wat er klaarstaat' });
        expect(list).toHaveTextContent('klaar tot 28 nov');
        expect(list).not.toHaveTextContent('Geprint op');
    });

    it('lists new contributions and the set that is ready, with its date', async () => {
        await seedCard(null, true, {
            contributions: 3,
            boxUntil: NOV_28,
            printer: { readyUntil: NOV_28, outdated: false },
            home: none,
        });

        const list = screen.getByRole('list', { name: 'Wat er klaarstaat' });
        expect(list).toHaveTextContent('3 nieuwe bijdragen');
        expect(list).toHaveTextContent('Drukkerij-set klaar tot 28 nov');
        expect(list).not.toHaveTextContent('Thuisprint-set');
        expect(list).not.toHaveTextContent('Samen maken');
    });

    it('shows the open link of a box, and says nothing of a set made before a change (Niek, 22 nov)', async () => {
        await seedCard(
            null,
            true,
            {
                contributions: 0,
                boxUntil: NOV_28,
                printer: none,
                home: { readyUntil: null, outdated: true },
            },
            40,
            { kind: 'changed', at: NOV_28 },
        );

        const list = screen.getByRole('list', { name: 'Wat er klaarstaat' });
        expect(list).toHaveTextContent('Samen maken: link open tot 28 nov');
        expect(list).not.toHaveTextContent(/verouderd/i);
        expect(list).toHaveTextContent('Geprint op 28 nov, daarna aangepast');
    });
});
