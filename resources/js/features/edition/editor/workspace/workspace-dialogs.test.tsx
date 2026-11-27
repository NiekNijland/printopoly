import { screen } from '@testing-library/react';

import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import { openWorkspace } from '@/features/edition/testing/workspace';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace dialogs', () => {
    it('opens the open messages from the address with ?check=1', async () => {
        window.history.replaceState(
            null,
            '',
            '/nl/editor/sample-edition-1?check=1',
        );
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);

        expect(
            await screen.findByRole('dialog', { name: 'Nog even nakijken' }),
        ).toBeInTheDocument();
    });

    it('asks which version to keep when another window saved something different', async () => {
        const { session, services } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        const stored = await services.storage.getEdition('sample-edition-1');
        await services.storage.applyPatch(
            'sample-edition-1',
            {
                baseRevision: stored?.revision ?? 0,
                elements: { 'card.chance.01': { text: 'Ander venster' } },
            },
            50,
        );
        services.bus.post({
            kind: 'saved',
            editionId: 'sample-edition-1',
            revision: 1,
        });
        session.apply([
            {
                key: 'space.01',
                before: undefined,
                after: { name: 'Dit venster' },
            },
        ]);
        await session.flush();

        expect(
            await screen.findByRole('dialog', {
                name: 'Twee versies van Zaterdagclub',
            }),
        ).toBeInTheDocument();
    });
});
