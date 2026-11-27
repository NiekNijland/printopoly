import { act, renderHook, waitFor } from '@testing-library/react';

import { EditionSession } from '@/features/edition/session';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { Edition } from '@/lib/render/edition-types';
import {
    makeBus,
    makeEdition,
    ManualScheduler,
} from '@/testing/edition-test-utils';
import { requestsOf, stubFetch } from '@/testing/fetch';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';

import { useRemotePush } from './use-remote-push';

const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

const logIn = (): void => {
    setPage(
        fakePage({
            auth: { user: { id: 'u1', name: 'Niek', email: 'n@example.test' } },
        }),
    );
};

const openSession = async (edition: Edition) => {
    const storage = new MemoryEditionStorage();
    await storage.createEdition(edition);
    const scheduler = new ManualScheduler();
    const session = new EditionSession(edition, {
        storage,
        bus: makeBus(null, 'w1'),
        now: () => 2_000,
        scheduler,
    });

    return { session, scheduler };
};

const saveChange = async (
    session: EditionSession,
    scheduler: ManualScheduler,
    name: string,
): Promise<void> => {
    await act(async () => {
        session.replace({ ...session.edition, name });
        scheduler.run();
        await session.flush();
    });
};

describe('useRemotePush', () => {
    it('asks nothing of the account when nobody is logged in', async () => {
        const fake = stubFetch();
        const { session } = await openSession(makeEdition());

        const { result } = renderHook(() => useRemotePush(session));

        expect(result.current).toMatchObject({
            loggedIn: false,
            pending: false,
            syncedAt: null,
            conflict: null,
            problem: null,
        });
        expect(fake).not.toHaveBeenCalled();
    });

    it('marks an edition that matches the account as synced', async () => {
        logIn();
        const edition = makeEdition({ id: 'e1' });
        const fake = stubFetch(() => json({ edition }));
        const { session } = await openSession(edition);

        const { result } = renderHook(() => useRemotePush(session));

        await waitFor(() => expect(result.current.syncedAt).not.toBeNull());
        expect(result.current.loggedIn).toBe(true);
        expect(result.current.pending).toBe(false);
        expect(requestsOf(fake)[0]?.url).toBe('/api/editions/e1');
    });

    it('says the person has to log in again when the account refuses', async () => {
        logIn();
        stubFetch(() => json({}, 401));
        const { session } = await openSession(makeEdition());

        const { result } = renderHook(() => useRemotePush(session));

        await waitFor(() => expect(result.current.problem).toBe('login'));
        expect(result.current.pending).toBe(true);
    });

    it('shows a conflict with both versions and takes the account version when chosen', async () => {
        logIn();
        const edition = makeEdition({ id: 'e1' });
        const theirs: Edition = {
            ...edition,
            name: 'Van het account',
            revision: 4,
            updatedAt: 3_000,
        };
        stubFetch((_url, init) =>
            init.method === 'PATCH'
                ? json({ current: theirs }, 409)
                : json({ edition }),
        );
        const { session, scheduler } = await openSession(edition);
        const { result } = renderHook(() => useRemotePush(session));
        await waitFor(() => expect(result.current.syncedAt).not.toBeNull());

        await saveChange(session, scheduler, 'Van mij');

        await waitFor(() => expect(result.current.conflict).not.toBeNull());
        expect(result.current.conflict).toMatchObject({
            editionId: 'e1',
            editionName: 'Van mij',
            theirs: { at: 3_000 },
            theirsEdition: theirs,
        });

        act(() => result.current.resolve('theirs'));

        await waitFor(() => expect(result.current.conflict).toBeNull());
        expect(session.edition.name).toBe('Van het account');
    });

    it('stops following the session when it unmounts', async () => {
        logIn();
        const edition = makeEdition({ id: 'e1' });
        const fake = stubFetch(() => json({ edition }));
        const { session, scheduler } = await openSession(edition);
        const { result, unmount } = renderHook(() => useRemotePush(session));
        await waitFor(() => expect(result.current.syncedAt).not.toBeNull());

        unmount();
        await saveChange(session, scheduler, 'Later');

        expect(fake).toHaveBeenCalledTimes(1);
    });
});
