import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { MemoryEditionStorage } from '../../lib/render/edition-storage';
import {
    ManualScheduler,
    changeOf,
    clock,
    counter,
    makeBus,
    settle,
} from '../../testing/edition-test-utils';
import { EditionRepository } from './repository';
import type { SaveStatus } from './save-status';
import { SaveStatusMachine } from './save-status-machine';

describe('SaveStatusMachine', () => {
    it('tells listeners only when the shown status changes', () => {
        const machine = new SaveStatusMachine();
        const listener = vi.fn<(status: SaveStatus) => void>();
        machine.subscribe(listener);

        machine.saving();
        machine.saving();
        machine.saved(10);
        machine.saved(10);
        machine.setOnline(false);
        expect(listener.mock.calls.map(([status]) => status.kind)).toEqual([
            'saving',
            'saved-local',
        ]);
        expect(machine.current).toEqual({
            kind: 'saved-local',
            at: 10,
            warning: false,
        });
    });

    it('goes through login, offline and back', () => {
        const machine = new SaveStatusMachine({ lastSavedAt: 10 });
        machine.setAccount({ loggedIn: true, pendingSync: true });
        expect(machine.current.kind).toBe('saving');
        machine.setOnline(false);
        expect(machine.current.kind).toBe('offline');
        machine.setOnline(true);
        machine.setAccount({ pendingSync: false, syncedAt: 20 });
        expect(machine.current).toEqual({
            kind: 'saved-account',
            at: 20,
            warning: false,
        });
    });

    it('takes the environment', () => {
        const machine = new SaveStatusMachine();
        machine.setEnvironment({
            privateWindow: false,
            safariEvictionRisk: true,
            storage: null,
        });
        // Nothing saved yet: no Safari note on a first visit (UX 10, ronde 4).
        expect(machine.current.kind).toBe('saved-local');
        machine.saved(5);
        expect(machine.current.kind).toBe('safari-eviction');
        machine.setEnvironment({
            privateWindow: false,
            safariEvictionRisk: false,
            storage: {
                usage: 90,
                quota: 100,
                ratio: 0.9,
                level: 'nearly-full',
            },
        });
        expect(machine.current.kind).toBe('storage-nearly-full');
        machine.setEnvironment({
            privateWindow: true,
            safariEvictionRisk: false,
            storage: null,
        });
        expect(machine.current.kind).toBe('private-window');
    });

    it('recovers from a full browser after a successful save', () => {
        const machine = new SaveStatusMachine();
        machine.failed(true);
        expect(machine.current.kind).toBe('storage-full');
        machine.saving();
        machine.saved(5);
        expect(machine.current.kind).toBe('saved-local');
    });

    it('follows the autosave of a session', async () => {
        const storage = new MemoryEditionStorage();
        const time = clock(5_000);
        const repository = new EditionRepository({
            storage,
            bus: makeBus(null, 'a'),
            now: time.now,
            newId: counter('id'),
            scheduler: new ManualScheduler(),
        });
        const edition = await repository.create({
            name: 'X',
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        });
        const session = await repository.open(edition.id);
        const machine = new SaveStatusMachine();
        const kinds: string[] = [];
        machine.subscribe((status) => kinds.push(status.kind));
        if (session === undefined) throw new Error('missing');
        const stop = machine.bind(session);

        time.set(6_000);
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.flush();
        expect(kinds).toEqual(['saving', 'saved-local']);
        expect(machine.current.at).toBe(6_000);

        storage.writeError = new DOMException('full', 'QuotaExceededError');
        session.apply([changeOf(session.edition, 'space.03', { name: 'B' })]);
        await session.flush();
        expect(machine.current.kind).toBe('storage-full');

        stop();
        storage.writeError = null;
        await session.flush();
        await settle();
        expect(machine.current.kind).toBe('storage-full');
    });

    it('stops saying "saving" when a conflict ends with the version of the other window', async () => {
        const storage = new MemoryEditionStorage();
        const time = clock(5_000);
        const make = (id: string) =>
            new EditionRepository({
                storage,
                bus: makeBus(null, id),
                now: time.now,
                newId: counter(id),
                scheduler: new ManualScheduler(),
            });
        const ra = make('a');
        const rb = make('b');
        const edition = await ra.create({
            name: 'X',
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        });
        const sa = await ra.open(edition.id);
        const sb = await rb.open(edition.id);
        if (sa === undefined || sb === undefined) throw new Error('missing');
        const machine = new SaveStatusMachine();
        machine.bind(sb);

        sa.apply([changeOf(sa.edition, 'space.01', { name: 'A' })]);
        await sa.flush();
        sb.apply([changeOf(sb.edition, 'space.03', { name: 'B' })]);
        await sb.flush();
        expect(sb.conflict).not.toBeNull();
        expect(machine.current.kind).toBe('saving');

        await sb.resolveConflict('theirs');
        expect(machine.current.kind).toBe('saved-local');
    });
});
