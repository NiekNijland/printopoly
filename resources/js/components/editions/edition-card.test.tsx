import type * as InertiaReact from '@inertiajs/react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AccountActions } from '@/lib/editor/account-actions';
import { installMemoryServices } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { EditionCard } from './edition-card';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage(),
}));

function fakeAccount(): AccountActions {
    return {
        rename: vi.fn(() => Promise.resolve()),
        copy: vi.fn(() => Promise.resolve()),
        remove: vi.fn(() => Promise.resolve()),
    };
}

async function seedCard(account: AccountActions | null, inAccount: boolean) {
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
                edition={summary}
                onChanged={onChanged}
                account={account}
                inAccount={inAccount}
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

describe('EditionCard with an account', () => {
    it('says where the edition is kept', async () => {
        await seedCard(fakeAccount(), true);

        expect(screen.getByText('In je account')).toBeInTheDocument();
        expect(screen.queryByText('In deze browser')).not.toBeInTheDocument();
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
                name: 'Meer opties voor Zaterdagclub',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Dupliceren' }),
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
