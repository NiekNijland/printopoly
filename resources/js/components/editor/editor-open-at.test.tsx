import type * as InertiaReact from '@inertiajs/react';
import { waitFor } from '@testing-library/react';

import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { EditorWorkspace } from './editor-workspace';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage({ auth: { googleLoginEnabled: true } }),
}));

async function session(): Promise<EditionSession> {
    const services = installMemoryServices();
    const edition = sampleEdition();
    await services.storage.createEdition(edition);

    return new EditionSession(edition, {
        storage: services.storage,
        bus: new EditionBus(null, 'w'),
        now: () => Date.now(),
        debounceMs: 5,
    });
}

/**
 * The print page links each message of Nog even nakijken to its field (B197), and Mijn edities opens a copy at its
 * name after Dupliceren: `?open=…&field=…` opens the editor there, once.
 */
describe('EditorWorkspace opened at a field', () => {
    afterEach(() => {
        window.history.replaceState(null, '', '/');
    });

    it('opens the edition at its name after Dupliceren, and takes the parameters off the address', async () => {
        window.history.replaceState(
            null,
            '',
            '/nl/editor/sample-edition-1?open=edition&field=edition.name',
        );

        renderWithI18n(<EditorWorkspace session={await session()} />);

        await waitFor(() => {
            expect(document.activeElement).toHaveAttribute(
                'data-field',
                'edition.name',
            );
        });
        expect(window.location.search).toBe('');
    });

    it('opens the element of a message from the print page', async () => {
        window.history.replaceState(
            null,
            '',
            '/nl/editor/sample-edition-1?open=card.chance.01&field=text',
        );

        const view = renderWithI18n(
            <EditorWorkspace session={await session()} />,
        );

        await waitFor(() => {
            expect(
                view.container.querySelector('[data-field="text"]'),
            ).not.toBeNull();
        });
        expect(window.location.search).toBe('');
    });
});
