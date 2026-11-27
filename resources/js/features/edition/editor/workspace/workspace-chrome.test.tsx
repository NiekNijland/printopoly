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

describe('EditorWorkspace phone bar', () => {
    it('has one menu in the phone top bar: the element first, then the edition (B151)', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(screen.getByRole('button', { name: /Station Noord/ }));

        // The panel head keeps its own ⋯ for the desktop; the phone has no second "Meer" button.
        expect(
            screen.getAllByRole('button', { name: 'Meer voor Station Noord' }),
        ).toHaveLength(1);
        await user.click(
            screen.getByRole('button', {
                name: 'Menu van Station Noord en Zaterdagclub',
            }),
        );
        const menu = await screen.findByRole('menu', {
            name: 'Menu van Station Noord en Zaterdagclub',
        });
        const items = within(menu)
            .getAllByRole('menuitem')
            .map((item) => item.textContent);
        expect(items[0]).toBe('Wisselen met…');
        expect(items[1]).toBe('Alle namen op het bord leegmaken');
        expect(items[2]).toMatch(/^Editie-instellingen/);
        expect(within(menu).getAllByRole('separator')[0]).toBeInTheDocument();

        await user.click(
            within(menu).getByRole('menuitem', { name: 'Wisselen met…' }),
        );
        await user.click(
            await screen.findByRole('button', { name: /Station Oost/ }),
        );
        // The status line under the panel says it, as it does for the desktop menu.
        expect(
            screen
                .getAllByRole('status')
                .some((line) =>
                    /Station Noord en Station Oost gewisseld/.test(
                        line.textContent,
                    ),
                ),
        ).toBe(true);
    });
});
