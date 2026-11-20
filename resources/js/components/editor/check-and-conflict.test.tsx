import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CheckIssue } from '@/lib/checks/types';
import type { EditionConflict } from '@/lib/edition/session';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { CheckPanel } from './check-panel';
import { ConflictDialog } from './conflict-dialog';

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

describe('CheckPanel', () => {
    it('lists every issue with the element and its tab, and opens the element on click', async () => {
        const user = userEvent.setup();
        const onOpen = vi.fn();

        renderWithI18n(
            <CheckPanel
                issues={[photoIssue, boardIssue]}
                edition={sampleEdition()}
                locale="nl"
                onOpen={onOpen}
            />,
        );

        expect(
            screen.getByText('2 dingen om naar te kijken'),
        ).toBeInTheDocument();
        await user.click(screen.getAllByRole('button')[0] as HTMLElement);

        expect(onOpen).toHaveBeenCalledWith('space.24');
        // Board-wide problems are not an element, so they are text, not a button.
        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(
            screen.getByText('Het bordprofiel klopt niet.'),
        ).toBeInTheDocument();
    });

    it('says what was checked when there is nothing to see', () => {
        renderWithI18n(
            <CheckPanel
                issues={[]}
                edition={sampleEdition()}
                locale="nl"
                onOpen={vi.fn()}
            />,
        );

        expect(
            screen.getByText(
                /niets gevonden. Gecontroleerd: fotoscherpte, tekst en bordmaat/,
            ),
        ).toBeInTheDocument();
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
