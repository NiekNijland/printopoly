import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import { openWorkspace } from '@/features/edition/testing/workspace';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace stage', () => {
    it('opens the edition panel from the name menu, with the whole board in the middle (B144, B145)', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(
            screen.getByRole('button', { name: 'Menu van Zaterdagclub' }),
        );
        await user.click(
            await screen.findByRole('menuitem', {
                name: /Editie-instellingen/,
            }),
        );

        const panel = screen.getByRole('complementary', { name: 'Overzicht' });
        expect(
            within(panel).getByRole('navigation', {
                name: 'Secties van de editie',
            }),
        ).toBeInTheDocument();
        expect(
            within(panel)
                .getAllByRole('region')
                .map((section) => section.getAttribute('aria-label')),
        ).toEqual(['Algemeen', 'Uiterlijk', 'Woorden', 'Bordmaat']);
        expect(
            screen.getByRole('button', {
                name: /^Overzicht: naam, thema, woorden, bordmaat/,
            }),
        ).toHaveAttribute('aria-current', 'true');

        await user.click(within(panel).getByRole('radio', { name: /Riso/ }));
        expect(session.edition.theme).toBe('riso');

        // Back to an element: the field panel comes back.
        await user.click(screen.getByRole('button', { name: /Station Noord/ }));
        expect(
            screen.queryByRole('complementary', { name: 'Overzicht' }),
        ).not.toBeInTheDocument();
    });
});
