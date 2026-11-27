import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { installMemoryServices } from '@/testing/editions';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { AccountControl } from './account-control';

const mocks = vi.hoisted(() => ({
    logout: vi.fn(),
    deleteAccount: vi.fn(),
    store: {
        listWithLimit: vi.fn(),
        get: vi.fn(),
        importEditions: vi.fn(),
    },
}));

vi.mock('@/features/edition/remote/account', () => ({
    logout: mocks.logout,
    deleteAccount: mocks.deleteAccount,
}));

const assign = vi.fn();

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

        const submit = within(dialog).getByRole('button', {
            name: 'Account verwijderen',
        });
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
