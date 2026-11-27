import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import { openWorkspace } from '@/features/edition/testing/workspace';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace shortcuts', () => {
    it('opens the edition panel with E', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.keyboard('e');

        expect(
            screen.getByRole('complementary', { name: 'Overzicht' }),
        ).toBeInTheDocument();
    });
});
