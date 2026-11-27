import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import { openWorkspace } from '@/features/edition/testing/workspace';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace data', () => {
    it('saves what was changed to the browser storage', async () => {
        const user = userEvent.setup();
        const { session, services } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.type(screen.getByLabelText('Naam'), '!');

        await waitFor(async () =>
            expect(
                (await services.storage.getEdition('sample-edition-1'))
                    ?.elements['space.01']?.name,
            ).toBe('Molenweg!'),
        );
    });
});
