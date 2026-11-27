import { screen, waitFor } from '@testing-library/react';

import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import { openWorkspace } from '@/features/edition/testing/workspace';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';


beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace start from the address', () => {
    it('goes straight to the field of a message from the print page (B197)', async () => {
        window.history.replaceState(
            null,
            '',
            '/nl/editor/sample-edition-1?element=space.05&field=name',
        );
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(
            screen.getByRole('heading', { name: 'Station Noord' }),
        ).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByLabelText('Naam')).toHaveFocus(),
        );
        // The address is plain again, so a reload does not jump.
        expect(window.location.search).toBe('');
    });

    it('opens the edition panel at a section from the address (vindbaarheid point 4)', async () => {
        window.history.replaceState(
            null,
            '',
            '/nl/editor/sample-edition-1?edition=words',
        );
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(
            screen.getByRole('complementary', { name: 'Overzicht' }),
        ).toBeInTheDocument();
        expect(window.location.search).toBe('');
    });
});
