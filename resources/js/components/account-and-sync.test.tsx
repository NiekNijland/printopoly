import type * as InertiaReact from '@inertiajs/react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AccountControl } from '@/components/account-control';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import EditionsIndex from '@/pages/editions/index';
import { installMemoryServices } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

const mocks = vi.hoisted(() => ({
    logout: vi.fn(),
    deleteAccount: vi.fn(),
    store: {
        listWithLimit: vi.fn(),
        get: vi.fn(),
        importEditions: vi.fn(),
    },
}));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () =>
        fakePage({
            auth: {
                user: { id: 'u1', name: 'Niek', email: 'niek@example.com' },
                googleLoginEnabled: true,
            },
        }),
    Head: () => null,
}));
vi.mock('@/lib/edition/remote/account', () => ({
    logout: mocks.logout,
    deleteAccount: mocks.deleteAccount,
}));
vi.mock('@/lib/edition/remote/store', () => ({
    createRemoteEditionStore: () => mocks.store,
}));

const assign = vi.fn();

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(window.location, 'assign').mockImplementation(assign);
});

const input = {
    language: 'nl' as const,
    theme: 'classic' as const,
    boardProfile: DEFAULT_BOARD_PROFILE,
};

describe('account menu', () => {
    it('logs out, clears the copy in this browser and leaves', async () => {
        const user = userEvent.setup();
        const { repository, storage } = installMemoryServices();
        await repository.create({ ...input, name: 'Zaterdagclub' });
        mocks.logout.mockResolvedValue({
            clearLocalCopy: true,
            redirect: '/nl',
        });

        renderWithI18n(<AccountControl />);
        await user.click(
            screen.getByRole('button', { name: 'Account van Niek' }),
        );
        expect(
            screen.getByText(/we de kopie in deze browser/),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Uitloggen' }));

        await waitFor(() => expect(assign).toHaveBeenCalledWith('/nl'));
        expect(await storage.listEditions()).toEqual([]);
    });

    it('asks for the e-mail address before deleting the account and shows a wrong one in the dialog', async () => {
        const user = userEvent.setup();

        installMemoryServices();
        mocks.deleteAccount.mockResolvedValueOnce({
            ok: false,
            reason: 'confirmation',
            message: '',
        });
        renderWithI18n(<AccountControl />);
        await user.click(
            screen.getByRole('button', { name: 'Account van Niek' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Account verwijderen' }),
        );
        const dialog = await screen.findByRole('dialog');

        const submit = screen
            .getAllByRole('button', { name: 'Account verwijderen' })
            .at(-1) as HTMLElement;
        expect(submit).toBeDisabled();
        await user.type(
            screen.getByLabelText('Je e-mailadres'),
            'iemand@example.com',
        );
        await user.click(submit);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Dat is niet het e-mailadres van dit account.',
        );
        expect(mocks.deleteAccount).toHaveBeenCalledWith('iemand@example.com');
        expect(dialog).toBeInTheDocument();
        expect(assign).not.toHaveBeenCalled();
    });
});

describe('sync after login', () => {
    it('asks once, and keeps the editions in the account on yes', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();
        await repository.create({ ...input, name: 'Zaterdagclub' });
        await repository.create({ ...input, name: 'Familie' });
        mocks.store.listWithLimit.mockResolvedValue({
            editions: [],
            limit: 20,
        });
        mocks.store.importEditions.mockImplementation(
            (editions: { id: string }[]) =>
                Promise.resolve({
                    imported: editions.map((edition) => edition.id),
                    conflicts: [],
                    overLimit: [],
                    invalid: {},
                }),
        );

        renderWithI18n(<EditionsIndex />);
        expect(
            await screen.findByRole('dialog', {
                name: 'Welkom, Niek. Je hebt 2 edities in deze browser.',
            }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Bewaren in mijn account' }),
        );

        expect(
            await screen.findByText('2 edities staan nu in je account.'),
        ).toBeInTheDocument();
        expect(mocks.store.importEditions).toHaveBeenCalledTimes(1);
        expect(mocks.store.importEditions.mock.calls[0]?.[0]).toHaveLength(2);
    });

    it('does not ask again after "Nu niet"', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();
        await repository.create({ ...input, name: 'Zaterdagclub' });
        mocks.store.listWithLimit.mockResolvedValue({
            editions: [],
            limit: 20,
        });

        const first = renderWithI18n(<EditionsIndex />);
        await user.click(
            await screen.findByRole('button', { name: 'Nu niet' }),
        );
        expect(mocks.store.importEditions).not.toHaveBeenCalled();
        first.unmount();

        renderWithI18n(<EditionsIndex />);
        await screen.findByRole('heading', { name: 'Zaterdagclub' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('brings editions that only exist in the account down as the local copy', async () => {
        const { repository } = installMemoryServices();
        const remote = {
            ...(await repository.create({
                ...input,
                name: 'Op ander apparaat',
            })),
            id: 'remote-edition-1',
        };
        await repository.delete((await repository.list())[0]?.id ?? '');
        mocks.store.listWithLimit.mockResolvedValue({
            editions: [
                { id: remote.id, name: remote.name, revision: 3, updatedAt: 5 },
            ],
            limit: 20,
        });
        mocks.store.get.mockResolvedValue({ ...remote, revision: 3 });

        renderWithI18n(<EditionsIndex />);

        expect(
            await screen.findByRole('heading', { name: 'Op ander apparaat' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('says when the account is not reachable and that the editions are safe here', async () => {
        const { repository } = installMemoryServices();
        await repository.create({ ...input, name: 'Zaterdagclub' });
        mocks.store.listWithLimit.mockRejectedValue(new Error('offline'));

        renderWithI18n(<EditionsIndex />);

        expect(
            await screen.findByText(/Je edities staan veilig in deze browser/),
        ).toBeInTheDocument();
    });
});
