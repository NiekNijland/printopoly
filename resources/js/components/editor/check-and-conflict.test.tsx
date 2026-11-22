import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CheckIssue } from '@/lib/checks/types';
import type { EditionConflict } from '@/lib/edition/session';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { ConflictDialog } from './conflict-dialog';
import { OpenMessages } from './open-messages';

const photoIssue: CheckIssue = {
    id: 'photo.low-resolution|space.24|photo',
    code: 'photo.low-resolution',
    elementKey: 'space.24',
    field: 'photo',
    severity: 'warning',
    icon: 'triangle-alert',
    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
    message: {
        nl: 'De foto heeft 112 dpi op dit formaat.',
        en: 'The photo has 112 dpi at this size.',
    },
};
const boardIssue: CheckIssue = {
    ...photoIssue,
    id: 'board.profile-invalid|board|board',
    code: 'board.profile-invalid',
    elementKey: 'board',
    message: {
        nl: 'Het bordprofiel klopt niet.',
        en: 'The board profile is wrong.',
    },
};

describe('OpenMessages (B197)', () => {
    it('lists every message under its tab and goes to the field on choosing one', async () => {
        const user = userEvent.setup();
        const onOpen = vi.fn();
        const onOpenChange = vi.fn();

        renderWithI18n(
            <OpenMessages
                open
                onOpenChange={onOpenChange}
                issues={[photoIssue, boardIssue]}
                edition={sampleEdition()}
                locale="nl"
                onOpen={onOpen}
            />,
        );

        const dialog = screen.getByRole('dialog', {
            name: 'Nog even nakijken',
        });
        expect(
            within(dialog).getAllByText('2 dingen om na te kijken.').length,
        ).toBeGreaterThan(0);
        expect(within(dialog).getAllByText('Bord').length).toBeGreaterThan(0);
        await user.click(
            within(dialog).getByText('De foto heeft 112 dpi op dit formaat.'),
        );

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onOpen).toHaveBeenCalledWith('space.24', 'photo');
    });

    it('does not open a board-wide message, which is no element', async () => {
        const user = userEvent.setup();
        const onOpen = vi.fn();

        renderWithI18n(
            <OpenMessages
                open
                onOpenChange={vi.fn()}
                issues={[boardIssue]}
                edition={sampleEdition()}
                locale="nl"
                onOpen={onOpen}
            />,
        );

        await user.click(screen.getByText('Het bordprofiel klopt niet.'));

        expect(onOpen).not.toHaveBeenCalled();
    });

    it('says so when there is nothing to check', () => {
        renderWithI18n(
            <OpenMessages
                open
                onOpenChange={vi.fn()}
                issues={[]}
                edition={sampleEdition()}
                locale="nl"
                onOpen={vi.fn()}
            />,
        );

        expect(
            screen.getAllByText(
                'Niets om na te kijken. Alles kan zo naar de printer.',
            ).length,
        ).toBeGreaterThan(0);
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
});

describe('ConflictDialog', () => {
    const conflict: EditionConflict = {
        editionId: 'e1',
        editionName: 'Zaterdagclub',
        mine: {
            at: Date.UTC(2026, 10, 20, 13, 32),
            summary: 'Stadspark aangepast',
        },
        theirs: {
            at: Date.UTC(2026, 10, 20, 13, 30),
            summary: '2 kaarten aangepast',
        },
        theirsEdition: sampleEdition(),
    };

    it('asks which version to keep and cannot be closed without choosing', async () => {
        const user = userEvent.setup();
        const onResolve = vi.fn();

        renderWithI18n(
            <ConflictDialog
                conflict={conflict}
                locale="nl"
                onResolve={onResolve}
            />,
        );

        expect(
            screen.getByRole('dialog', {
                name: 'Twee versies van Zaterdagclub',
            }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Stadspark aangepast/)).toBeInTheDocument();
        expect(screen.getByText(/2 kaarten aangepast/)).toBeInTheDocument();

        await user.keyboard('{Escape}');
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Die van het andere venster' }),
        );
        expect(onResolve).toHaveBeenCalledWith('theirs');
        await user.click(screen.getByRole('button', { name: 'Deze houden' }));
        expect(onResolve).toHaveBeenCalledWith('mine');
    });

    it('renders nothing without a conflict', () => {
        renderWithI18n(
            <ConflictDialog conflict={null} locale="nl" onResolve={vi.fn()} />,
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
