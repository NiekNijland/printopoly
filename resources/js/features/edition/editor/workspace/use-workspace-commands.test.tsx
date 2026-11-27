import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import { openWorkspace } from '@/features/edition/testing/workspace';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace commands', () => {
    it('has Deel je bord in the name menu and no Samen maken for an edition without a link (B202, R5-16)', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(
            screen.getByRole('button', { name: 'Menu van Zaterdagclub' }),
        );

        expect(
            await screen.findByRole('menuitem', { name: /Deel je bord/ }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('menuitem', { name: /Samen maken/ }),
        ).not.toBeInTheDocument();
    });
});

describe('EditorWorkspace undo and redo (UX 7, ronde 3)', () => {
    it('shows the element that undo changed and says what came back', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        act(() => {
            session.apply([
                {
                    key: 'space.03',
                    before: undefined,
                    after: { name: 'De Opel van papa' },
                },
            ]);
        });
        // Somewhere else in the editor when the person undoes.
        await user.click(screen.getByRole('button', { name: /Station Noord/ }));
        expect(
            screen.getByRole('heading', { name: 'Station Noord' }),
        ).toBeInTheDocument();

        act(() => {
            session.undo();
        });

        expect(
            screen.getByRole('heading', { name: 'Veldweg' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Ongedaan: naam van Veldweg.'),
        ).toBeInTheDocument();

        act(() => {
            session.redo();
        });
        expect(
            screen.getByText('Opnieuw gedaan: naam van De Opel van papa.'),
        ).toBeInTheDocument();
    });
});
