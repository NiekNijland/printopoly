import { screen, waitFor } from '@testing-library/react';

import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
import type * as Services from '@/lib/editor/services';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { EditorWorkspace } from './editor-workspace';

beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});
// Safari, on a first visit: the browser may clear the site after 7 days.
vi.mock('@/lib/editor/services', async (importOriginal) => ({
    ...(await importOriginal<typeof Services>()),
    getEnvironment: () =>
        Promise.resolve({
            privateWindow: false,
            safariEvictionRisk: true,
            storage: null,
        }),
}));

async function open() {
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

describe('save status in the editor (UX 10, ronde 4)', () => {
    it('says "Bewaard op dit toestel" with a tick, and no Safari warning before any change', async () => {
        const session = await open();
        renderWithI18n(<EditorWorkspace session={session} />);

        // Let the environment arrive.
        await waitFor(() =>
            expect(
                screen
                    .getAllByText(/Bewaard op dit toestel/)[0]
                    ?.querySelector('svg[data-saved]'),
            ).not.toBeNull(),
        );

        expect(screen.queryByText(/Safari/)).toBeNull();
    });
});
