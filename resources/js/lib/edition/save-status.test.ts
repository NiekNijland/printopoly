import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { EditionRepository } from './repository';
import {
    SaveStatusMachine,
    deriveSaveStatus,
    describeSaveStatus,
    initialSaveStatusInput,
    type SaveStatusInput,
    type TimeFormatter,
} from './save-status';
import { MemoryEditionStorage } from './storage';
import { ManualScheduler, changeOf, clock, counter, makeBus, settle } from './test-utils';

const at = 1_000;
const fixedTime: TimeFormatter = () => '14:32';
const input = (patch: Partial<SaveStatusInput> = {}): SaveStatusInput => ({
    ...initialSaveStatusInput,
    lastSavedAt: at,
    ...patch,
});
const env = (patch: Partial<SaveStatusInput['environment']>) => ({ ...initialSaveStatusInput.environment, ...patch });

describe('deriveSaveStatus', () => {
    it('is "saved locally" by default', () => {
        expect(deriveSaveStatus(input())).toEqual({ kind: 'saved-local', at, warning: false });
        expect(deriveSaveStatus(initialSaveStatusInput)).toEqual({ kind: 'saved-local', warning: false });
    });

    it('shows saving while a save runs', () => {
        expect(deriveSaveStatus(input({ phase: 'saving' }))).toEqual({ kind: 'saving', warning: false });
    });

    it('shows saved to account when logged in and synced', () => {
        const status = deriveSaveStatus(input({ account: { loggedIn: true, pendingSync: false, syncedAt: 5 } }));
        expect(status).toEqual({ kind: 'saved-account', at: 5, warning: false });
        expect(deriveSaveStatus(input({ account: { loggedIn: true, pendingSync: false, syncedAt: null } })).at).toBe(
            at,
        );
    });

    it('shows saving while changes still go to the account', () => {
        expect(deriveSaveStatus(input({ account: { loggedIn: true, pendingSync: true, syncedAt: 5 } })).kind).toBe(
            'saving',
        );
    });

    it('shows offline only for people with an account', () => {
        expect(
            deriveSaveStatus(input({ online: false, account: { loggedIn: true, pendingSync: true, syncedAt: 5 } }))
                .kind,
        ).toBe('offline');
        expect(deriveSaveStatus(input({ online: false })).kind).toBe('saved-local');
    });

    it('warns in a private window, even while saving', () => {
        expect(deriveSaveStatus(input({ environment: env({ privateWindow: true }) }))).toMatchObject({
            kind: 'private-window',
            warning: true,
        });
        expect(deriveSaveStatus(input({ phase: 'saving', environment: env({ privateWindow: true }) })).kind).toBe(
            'private-window',
        );
    });

    it('mentions Safari clearing data after 7 days', () => {
        expect(deriveSaveStatus(input({ environment: env({ safariEvictionRisk: true }) })).kind).toBe(
            'safari-eviction',
        );
        expect(
            deriveSaveStatus(
                input({
                    environment: env({ safariEvictionRisk: true }),
                    account: { loggedIn: true, pendingSync: false, syncedAt: 1 },
                }),
            ).kind,
        ).toBe('saved-account');
    });

    it('warns when storage is nearly full (B82), but not for people with an account', () => {
        expect(deriveSaveStatus(input({ environment: env({ storageLevel: 'nearly-full' }) })).kind).toBe(
            'storage-nearly-full',
        );
        expect(
            deriveSaveStatus(
                input({
                    environment: env({ storageLevel: 'nearly-full' }),
                    account: { loggedIn: true, pendingSync: false, syncedAt: 1 },
                }),
            ).kind,
        ).toBe('saved-account');
    });

    it('puts a failed save above everything', () => {
        expect(deriveSaveStatus(input({ phase: 'failed-quota', environment: env({ privateWindow: true }) }))).toEqual({
            kind: 'storage-full',
            warning: true,
        });
        expect(deriveSaveStatus(input({ phase: 'failed-other' }))).toEqual({ kind: 'save-failed', warning: true });
    });
});

describe('describeSaveStatus', () => {
    const d = (status: Parameters<typeof describeSaveStatus>[0], locale: 'nl' | 'en' = 'nl') =>
        describeSaveStatus(status, locale, fixedTime);

    it.each([
        [{ kind: 'saving', warning: false }, 'Opslaan…'],
        [{ kind: 'saved-local', at, warning: false }, 'Alleen in deze browser · 14:32 · Inloggen met Google'],
        [{ kind: 'saved-account', at, warning: false }, 'Opgeslagen in je account · 14:32'],
        [
            { kind: 'offline', at, warning: false },
            'Offline: alleen in deze browser. Zodra je weer online bent, gaat het naar je account.',
        ],
        [
            { kind: 'private-window', warning: true },
            'Privévenster: alles is weg als je dit venster sluit. Inloggen met Google',
        ],
        [
            { kind: 'safari-eviction', warning: false },
            'Safari wist dit als je de site 7 dagen niet opent. Inloggen met Google',
        ],
        [
            { kind: 'storage-full', warning: true },
            'Niet opgeslagen: de opslag van je browser is vol. Inloggen met Google',
        ],
    ] as const)('uses the wording of the design for %j', (status, expected) => {
        expect(d(status).text).toBe(expected);
    });

    it('splits the login prompt from the message so the UI can make it a link', () => {
        expect(d({ kind: 'saved-local', at, warning: false })).toEqual({
            message: 'Alleen in deze browser · 14:32',
            actionLabel: 'Inloggen met Google',
            text: 'Alleen in deze browser · 14:32 · Inloggen met Google',
        });
        expect(d({ kind: 'saved-account', at, warning: false }).actionLabel).toBeNull();
        expect(d({ kind: 'offline', warning: false }).actionLabel).toBeNull();
    });

    it('leaves out the time before the first save', () => {
        expect(d({ kind: 'saved-local', warning: false }).text).toBe('Alleen in deze browser · Inloggen met Google');
    });

    it('has English wording', () => {
        expect(d({ kind: 'saved-local', at, warning: false }, 'en').text).toBe(
            'Only in this browser · 14:32 · Sign in with Google',
        );
        expect(d({ kind: 'storage-nearly-full', warning: false }, 'en').text).toBe(
            'Your browser storage is almost full. Sign in with Google',
        );
        expect(d({ kind: 'save-failed', warning: true }).text).toContain('Niet opgeslagen');
    });

    it('formats the clock', () => {
        const status = describeSaveStatus(
            { kind: 'saved-account', at: new Date(2026, 10, 20, 14, 32).getTime(), warning: false },
            'nl',
        );
        expect(status.message).toBe('Opgeslagen in je account · 14:32');
    });
});

describe('SaveStatusMachine', () => {
    it('tells listeners only when the shown status changes', () => {
        const machine = new SaveStatusMachine();
        const listener = vi.fn();
        machine.subscribe(listener);

        machine.saving();
        machine.saving();
        machine.saved(10);
        machine.saved(10);
        machine.setOnline(false);
        expect(listener.mock.calls.map(([status]) => status.kind)).toEqual(['saving', 'saved-local']);
        expect(machine.current).toEqual({ kind: 'saved-local', at: 10, warning: false });
    });

    it('goes through login, offline and back', () => {
        const machine = new SaveStatusMachine({ lastSavedAt: 10 });
        machine.setAccount({ loggedIn: true, pendingSync: true });
        expect(machine.current.kind).toBe('saving');
        machine.setOnline(false);
        expect(machine.current.kind).toBe('offline');
        machine.setOnline(true);
        machine.setAccount({ pendingSync: false, syncedAt: 20 });
        expect(machine.current).toEqual({ kind: 'saved-account', at: 20, warning: false });
    });

    it('takes the environment', () => {
        const machine = new SaveStatusMachine();
        machine.setEnvironment({ privateWindow: false, safariEvictionRisk: true, storage: null });
        expect(machine.current.kind).toBe('safari-eviction');
        machine.setEnvironment({
            privateWindow: false,
            safariEvictionRisk: false,
            storage: { usage: 90, quota: 100, ratio: 0.9, level: 'nearly-full' },
        });
        expect(machine.current.kind).toBe('storage-nearly-full');
        machine.setEnvironment({ privateWindow: true, safariEvictionRisk: false, storage: null });
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
});
