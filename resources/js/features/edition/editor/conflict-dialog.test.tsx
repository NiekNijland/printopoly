import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { formatClock } from '@/features/edition/save-status';
import type { EditionConflict } from '@/features/edition/session-conflict';
import { makeEdition } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { ConflictDialog } from './conflict-dialog';

const MINE_AT = Date.UTC(2026, 2, 14, 9, 30);
const THEIRS_AT = Date.UTC(2026, 2, 14, 9, 45);

const conflict: EditionConflict = {
    editionId: 'e1',
    editionName: 'Zaterdagclub',
    mine: { at: MINE_AT, summary: '2 velden anders' },
    theirs: { at: THEIRS_AT, summary: 'Naam aangepast' },
    theirsEdition: makeEdition({ id: 'e1' }),
};

type Resolve = (choice: 'mine' | 'theirs') => void;

describe('ConflictDialog', () => {
    it('shows nothing without a conflict', () => {
        renderWithI18n(
            <ConflictDialog
                conflict={null}
                locale="nl"
                onResolve={vi.fn<Resolve>()}
            />,
        );

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('shows both versions with their time and what changed', () => {
        renderWithI18n(
            <ConflictDialog
                conflict={conflict}
                locale="nl"
                onResolve={vi.fn<Resolve>()}
            />,
        );

        const dialog = screen.getByRole('dialog', {
            name: 'Twee versies van Zaterdagclub',
        });
        expect(dialog).toHaveAccessibleDescription(
            'Je hebt deze editie ook in een ander venster aangepast. Welke versie houd je?',
        );
        expect(dialog).toHaveTextContent(
            `Dit venster${formatClock(MINE_AT, 'nl')} · 2 velden anders`,
        );
        expect(dialog).toHaveTextContent(
            `Ander venster${formatClock(THEIRS_AT, 'nl')} · Naam aangepast`,
        );
    });

    it('labels the versions in English on an English page', () => {
        renderWithI18n(
            <ConflictDialog
                conflict={conflict}
                locale="en"
                onResolve={vi.fn<Resolve>()}
            />,
            'en',
        );

        expect(screen.getByRole('dialog')).toHaveTextContent('This window');
        expect(screen.getByRole('dialog')).toHaveTextContent('Other window');
    });

    it('passes on the chosen version', async () => {
        const user = userEvent.setup();
        const onResolve = vi.fn<Resolve>();
        renderWithI18n(
            <ConflictDialog
                conflict={conflict}
                locale="nl"
                onResolve={onResolve}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Die van het andere venster' }),
        );
        await user.click(screen.getByRole('button', { name: 'Deze houden' }));

        expect(onResolve.mock.calls).toEqual([['theirs'], ['mine']]);
    });

    it('cannot be closed without a choice', async () => {
        const user = userEvent.setup();
        const onResolve = vi.fn<Resolve>();
        renderWithI18n(
            <ConflictDialog
                conflict={conflict}
                locale="nl"
                onResolve={onResolve}
            />,
        );

        await user.keyboard('{Escape}');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(onResolve).not.toHaveBeenCalled();
    });
});
