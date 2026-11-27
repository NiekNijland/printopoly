import { describe, expect, it, vi } from 'vitest';

import { EditionBus } from '@/features/edition/bus';
import {
    RemoteAuthError,
    RemoteRateLimitError,
} from '@/features/edition/remote/client';
import type { AccountEditionStore } from '@/features/edition/remote/store';
import { EditionSession } from '@/features/edition/session';
import { createEdition } from '@/lib/render/edition-changes';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { Edition } from '@/lib/render/edition-types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { installMemoryServices } from '@/testing/editions';

import { classifySyncError, wipeLocalCopy } from './account';
import { RemoteSync, type RemoteSyncEvent } from './remote-sync';

type RemoteChangeResult = Awaited<ReturnType<AccountEditionStore['patch']>>;

const baseEdition = (): Edition => {
    return createEdition(
        {
            name: 'Zaterdagclub',
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        },
        { id: 'e1', now: 1 },
    );
};

const notUsed = (): Promise<never> =>
    Promise.reject(new Error('not used by this test'));

const accountStore = (
    overrides: Partial<AccountEditionStore>,
): AccountEditionStore => ({
    list: notUsed,
    get: notUsed,
    put: notUsed,
    putPhoto: notUsed,
    delete: notUsed,
    listWithLimit: notUsed,
    patch: notUsed,
    rename: notUsed,
    duplicate: notUsed,
    importEditions: notUsed,
    ...overrides,
});

const setup = async (remote: Partial<AccountEditionStore>) => {
    const storage = new MemoryEditionStorage();
    const edition = baseEdition();
    await storage.createEdition(edition);
    const session = new EditionSession(edition, {
        storage,
        bus: new EditionBus(null, 'w'),
        now: () => 100,
        debounceMs: 10_000,
    });
    const events: RemoteSyncEvent[] = [];
    const sync = new RemoteSync(
        accountStore(remote),
        session,
        (event) => events.push(event),
        () => 500,
    );

    return { session, sync, events, storage };
};

const rename = (session: EditionSession, name: string) =>
    session.apply([
        {
            key: 'space.01',
            before: undefined,
            after: { name },
        },
    ]);

describe('RemoteSync', () => {
    it('does nothing for an edition that is not in the account (it stays local)', async () => {
        const patch = vi.fn();
        const { session, sync } = await setup({
            get: () => Promise.resolve(undefined),
            patch,
        });

        await sync.start();
        rename(session, 'Jans Bierkelder');
        await session.flush();
        await sync.push();

        expect(patch).not.toHaveBeenCalled();
    });

    it('sends only the changed elements against the revision the account has', async () => {
        const patch = vi.fn((): Promise<RemoteChangeResult> =>
            Promise.resolve({ ok: true, revision: 8, updatedAt: 999 }),
        );
        const { session, sync, events } = await setup({
            get: () => Promise.resolve({ ...baseEdition(), revision: 7 }),
            patch,
        });

        await sync.start();
        rename(session, 'Jans Bierkelder');
        await sync.push();

        expect(patch).toHaveBeenCalledWith('e1', {
            baseRevision: 7,
            elements: { 'space.01': { name: 'Jans Bierkelder' } },
        });
        expect(events.at(-1)).toEqual({
            type: 'state',
            pending: false,
            syncedAt: 500,
        });

        // The next push starts from revision 8 and sends only what is new.
        rename(session, 'Het Hok');
        await sync.push();
        expect(patch).toHaveBeenLastCalledWith('e1', {
            baseRevision: 8,
            elements: { 'space.01': { name: 'Het Hok' } },
        });
    });

    it('turns a 409 into a conflict and stops pushing until the person chooses', async () => {
        const current: Edition = {
            ...baseEdition(),
            revision: 9,
            elements: { 'card.chance.01': { text: 'Van het account' } },
        };
        const patch = vi.fn((): Promise<RemoteChangeResult> =>
            Promise.resolve({ ok: false, reason: 'conflict', current }),
        );
        const { session, sync, events } = await setup({
            get: () => Promise.resolve({ ...baseEdition(), revision: 7 }),
            patch,
        });

        await sync.start();
        rename(session, 'Mijn naam');
        await sync.push();

        expect(events).toContainEqual({ type: 'conflict', current });
        await sync.push();
        expect(patch).toHaveBeenCalledTimes(1);
    });

    it('keeps this version on "Deze houden" by replacing the account version it saw', async () => {
        const current: Edition = { ...baseEdition(), revision: 9 };
        const put = vi.fn(() =>
            Promise.resolve({ ok: true as const, revision: 10 }),
        );
        const { session, sync } = await setup({
            get: () => Promise.resolve({ ...baseEdition(), revision: 7 }),
            patch: () =>
                Promise.resolve({ ok: false, reason: 'conflict', current }),
            put,
        });

        await sync.start();
        rename(session, 'Mijn naam');
        await sync.push();
        await sync.resolve('mine');

        expect(put).toHaveBeenCalledWith(session.edition, 9);
    });

    it('takes the account version on "Die van het andere venster" and saves it locally', async () => {
        const current: Edition = {
            ...baseEdition(),
            revision: 9,
            elements: { 'card.chance.01': { text: 'Van het account' } },
        };
        const { session, sync, storage } = await setup({
            get: () => Promise.resolve({ ...baseEdition(), revision: 7 }),
            patch: () =>
                Promise.resolve({ ok: false, reason: 'conflict', current }),
        });

        await sync.start();
        rename(session, 'Mijn naam');
        await session.flush();
        await sync.push();
        await sync.resolve('theirs');

        expect(session.edition.elements['card.chance.01']?.text).toBe(
            'Van het account',
        );
        expect(session.edition.elements['space.01']).toBeUndefined();
        expect(
            (await storage.getEdition('e1'))?.elements['card.chance.01']?.text,
        ).toBe('Van het account');
    });

    it('treats an edition deleted in the account as local again', async () => {
        const { session, sync, events } = await setup({
            get: () => Promise.resolve({ ...baseEdition(), revision: 7 }),
            patch: () => Promise.resolve({ ok: false, reason: 'missing' }),
        });

        await sync.start();
        rename(session, 'x');
        await sync.push();

        expect(events.at(-1)).toMatchObject({ type: 'state', pending: false });
    });

    it('reports an error and tries again on the next save', async () => {
        let fail = true;
        const patch = vi.fn((): Promise<RemoteChangeResult> =>
            fail
                ? Promise.reject(new RemoteAuthError(401, {}))
                : Promise.resolve({ ok: true, revision: 8, updatedAt: 1 }),
        );
        const { session, sync, events } = await setup({
            get: () => Promise.resolve({ ...baseEdition(), revision: 7 }),
            patch,
        });

        await sync.start();
        rename(session, 'x');
        await sync.push();
        expect(events.some((event) => event.type === 'error')).toBe(true);

        fail = false;
        await sync.push();
        expect(events.at(-1)).toMatchObject({ type: 'state', pending: false });
    });
});

describe('account helpers', () => {
    it('tells a login problem from a rate limit and anything else', () => {
        expect(classifySyncError(new RemoteAuthError(419, {}))).toBe('login');
        expect(classifySyncError(new RemoteRateLimitError({}, 30))).toBe(
            'rate-limit',
        );
        expect(classifySyncError(new Error('network'))).toBe('failed');
    });

    it('wipes every edition and its photos from this browser', async () => {
        const { repository, storage } = installMemoryServices();
        await repository.create({
            name: 'A',
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        });
        await repository.create({
            name: 'B',
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        });

        await wipeLocalCopy(repository);

        expect(await storage.listEditions()).toEqual([]);
    });
});
