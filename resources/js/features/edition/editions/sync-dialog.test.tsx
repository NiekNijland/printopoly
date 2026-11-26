import { screen } from '@testing-library/react';

import type { AccountSync } from '@/features/edition/use-account-sync';
import { renderWithI18n } from '@/testing/render';

import { SyncDialog } from './sync-dialog';

function sync(imported: number, conflicts = 0, overLimit = 0): AccountSync {
    return {
        question: null,
        working: false,
        outcome: { imported, conflicts, overLimit },
        problem: null,
        accountIds: null,
        refreshAccount: () => undefined,
        accept: () => undefined,
        decline: () => undefined,
    };
}

describe('SyncDialog result', () => {
    it('uses the singular for one edition', () => {
        renderWithI18n(<SyncDialog sync={sync(1, 1, 1)} />);

        expect(
            screen.getByText('1 editie staat nu in je account.'),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/^1 editie staat al in je account/),
        ).toBeInTheDocument();
        expect(
            screen.getByText('1 editie paste niet meer in je account.'),
        ).toBeInTheDocument();
    });

    it('uses the plural for more, in both languages', () => {
        const view = renderWithI18n(<SyncDialog sync={sync(3)} />);
        expect(
            screen.getByText('3 edities staan nu in je account.'),
        ).toBeInTheDocument();
        view.unmount();

        renderWithI18n(<SyncDialog sync={sync(3)} />, 'en');
        expect(
            screen.getByText('3 editions are now in your account.'),
        ).toBeInTheDocument();
    });
});
