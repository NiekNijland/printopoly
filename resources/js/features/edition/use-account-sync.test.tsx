import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SyncDialog } from '@/features/edition/editions/sync-dialog';
import { useEditionList } from '@/features/edition/use-editions';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { installMemoryServices } from '@/testing/editions';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { useAccountSync } from './use-account-sync';

const mocks = vi.hoisted(() => ({
    store: {
        listWithLimit: vi.fn(),
        get: vi.fn(),
        importEditions: vi.fn(),
    },
}));

vi.mock('@/features/edition/remote/store', () => ({
    createRemoteEditionStore: () => mocks.store,
}));

beforeEach(() => {
    vi.clearAllMocks();
    setPage(
        fakePage({
            auth: {
                user: { id: 'u1', name: 'Niek', email: 'niek@example.com' },
                googleLoginEnabled: true,
            },
        }),
    );
    localStorage.clear();
});

const input = {
    language: 'nl' as const,
    theme: 'classic' as const,
    boardProfile: DEFAULT_BOARD_PROFILE,
};

const EditionsWithSync = () => {
    const { editions, refresh } = useEditionList();
    const sync = useAccountSync(refresh);

    return (
        <>
            <SyncDialog sync={sync} />
            {editions?.map((edition) => (
                <h2 key={edition.id}>{edition.name}</h2>
            ))}
        </>
    );
};

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

        renderWithI18n(<EditionsWithSync />);
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

        const first = renderWithI18n(<EditionsWithSync />);
        await user.click(
            await screen.findByRole('button', { name: 'Nu niet' }),
        );
        expect(mocks.store.importEditions).not.toHaveBeenCalled();
        first.unmount();

        renderWithI18n(<EditionsWithSync />);
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

        renderWithI18n(<EditionsWithSync />);

        expect(
            await screen.findByRole('heading', { name: 'Op ander apparaat' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('says when the account is not reachable and that the editions are safe here', async () => {
        const { repository } = installMemoryServices();
        await repository.create({ ...input, name: 'Zaterdagclub' });
        mocks.store.listWithLimit.mockRejectedValue(new Error('offline'));

        renderWithI18n(<EditionsWithSync />);

        expect(
            await screen.findByText(/Je edities staan veilig in deze browser/),
        ).toBeInTheDocument();
    });
});
