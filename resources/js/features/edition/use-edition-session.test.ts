import { act, renderHook, waitFor } from '@testing-library/react';

import { setEnvironment } from '@/features/edition/editor/services';
import { EditionSession } from '@/features/edition/session';
import { updateElement } from '@/lib/render/edition-changes';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import {
    createFakeNetwork,
    makeBus,
    makeEdition,
    ManualScheduler,
} from '@/testing/edition-test-utils';
import { installMemoryServices, sampleEdition } from '@/testing/editions';

import {
    useEditionSession,
    useSaveStatus,
    useSessionSnapshot,
} from './use-edition-session';

const environment = {
    privateWindow: false,
    safariEvictionRisk: false,
    persisted: true,
    storage: null,
};

const looseSession = () =>
    new EditionSession(makeEdition({ id: 'e1' }), {
        storage: new MemoryEditionStorage(),
        bus: makeBus(null, 'w1'),
        now: () => 1_000,
        scheduler: new ManualScheduler(),
    });

describe('useEditionSession', () => {
    it('opens the edition and closes it when the page goes', async () => {
        const { storage } = installMemoryServices();
        await storage.createEdition(sampleEdition({ id: 'e1' }));

        const { result, unmount } = renderHook(() => useEditionSession('e1'));

        expect(result.current).toEqual({ status: 'loading' });
        await waitFor(() => expect(result.current.status).toBe('ready'));
        const session =
            result.current.status === 'ready' ? result.current.session : null;
        expect(session?.edition.id).toBe('e1');
        const close = vi.spyOn(EditionSession.prototype, 'close');
        unmount();
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('says when the edition is not in this browser', async () => {
        installMemoryServices();

        const { result } = renderHook(() => useEditionSession('nope'));

        await waitFor(() =>
            expect(result.current).toEqual({ status: 'missing' }),
        );
    });

    it('says when the browser cannot open it', async () => {
        const { repository } = installMemoryServices();
        vi.spyOn(repository, 'open').mockRejectedValue(new Error('blocked'));

        const { result } = renderHook(() => useEditionSession('e1'));

        await waitFor(() =>
            expect(result.current).toEqual({ status: 'error' }),
        );
    });

    it('closes a session that opens after the page went', async () => {
        const { storage } = installMemoryServices();
        await storage.createEdition(sampleEdition({ id: 'e1' }));
        const close = vi.spyOn(EditionSession.prototype, 'close');

        const { unmount } = renderHook(() => useEditionSession('e1'));
        unmount();

        await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    });
});

describe('useSessionSnapshot', () => {
    it('follows the working copy and the undo state', () => {
        const session = looseSession();
        const { result } = renderHook(() => useSessionSnapshot(session));
        expect(result.current).toMatchObject({
            canUndo: false,
            canRedo: false,
            conflict: null,
            deletedElsewhere: false,
        });

        act(() => {
            const { change } = updateElement(session.edition, 'space.01', {
                name: 'Molenweg',
            });
            session.apply(change === null ? [] : [change]);
        });
        expect(result.current.edition.elements['space.01']?.name).toBe(
            'Molenweg',
        );
        expect(result.current.canUndo).toBe(true);

        act(() => {
            session.undo();
        });
        expect(result.current.canRedo).toBe(true);
    });

    it('knows when another window deleted the edition', async () => {
        const network = createFakeNetwork();
        const session = new EditionSession(makeEdition({ id: 'e1' }), {
            storage: new MemoryEditionStorage(),
            bus: makeBus(network, 'w1'),
            now: () => 1_000,
            scheduler: new ManualScheduler(),
        });
        const { result } = renderHook(() => useSessionSnapshot(session));

        makeBus(network, 'w2').post({ kind: 'deleted', editionId: 'e1' });

        await waitFor(() => expect(result.current.deletedElsewhere).toBe(true));
    });
});

describe('useSaveStatus', () => {
    it('says the edition is kept on this device', async () => {
        setEnvironment(environment);
        const { result } = renderHook(() => useSaveStatus(looseSession()));

        await waitFor(() =>
            expect(result.current.text.message).toBe('Bewaard op dit toestel'),
        );
        expect(result.current.status.kind).toBe('saved-local');
    });

    it('warns in a private window', async () => {
        setEnvironment({ ...environment, privateWindow: true });

        const { result } = renderHook(() => useSaveStatus(looseSession()));

        await waitFor(() =>
            expect(result.current.status.kind).toBe('private-window'),
        );
        expect(result.current.text.message).toBe(
            'Privévenster: alles is weg als je dit venster sluit.',
        );
    });

    it('follows the account and the connection', async () => {
        setEnvironment(environment);
        const session = looseSession();
        const { result, rerender } = renderHook(
            ({ pendingSync }) =>
                useSaveStatus(session, {
                    loggedIn: true,
                    pendingSync,
                    syncedAt: null,
                }),
            { initialProps: { pendingSync: false } },
        );
        await waitFor(() =>
            expect(result.current.status.kind).toBe('saved-account'),
        );

        rerender({ pendingSync: true });
        expect(result.current.status.kind).toBe('saving');

        act(() => {
            window.dispatchEvent(new Event('offline'));
        });
        expect(result.current.status.kind).toBe('offline');

        act(() => {
            window.dispatchEvent(new Event('online'));
        });
        expect(result.current.status.kind).toBe('saving');
    });

    it('shows the time of the last save', async () => {
        setEnvironment(environment);
        const storage = new MemoryEditionStorage();
        await storage.createEdition(makeEdition({ id: 'e1' }));
        const session = new EditionSession(makeEdition({ id: 'e1' }), {
            storage,
            bus: makeBus(null, 'w1'),
            now: () => 1_000,
            scheduler: new ManualScheduler(),
        });
        const { result } = renderHook(() => useSaveStatus(session));

        act(() => {
            const { change } = updateElement(session.edition, 'space.01', {
                name: 'Molenweg',
            });
            session.apply(change === null ? [] : [change]);
            void session.flush();
        });

        await waitFor(() =>
            expect(result.current.text.message).toMatch(
                /^Bewaard op dit toestel · /,
            ),
        );
    });
});
