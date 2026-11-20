import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { EditionRepository } from './repository';
import type { EditionSession, SessionEvent } from './session';
import { changeTheme, rename, setPart } from './settings';
import { MemoryEditionStorage } from './storage';
import { ManualScheduler, changeOf, clock, counter, createFakeNetwork, makeBus, photo, settle } from './test-utils';

const input = { name: 'Zaterdagclub', language: 'nl', theme: 'classic', boardProfile: DEFAULT_BOARD_PROFILE } as const;

/** Two windows on one browser: same storage, one shared channel network. */
function setup() {
    const storage = new MemoryEditionStorage();
    const network = createFakeNetwork();
    const time = clock(1_000);
    const newId = counter('id');
    const make = (windowId: string) => {
        const scheduler = new ManualScheduler();
        const repository = new EditionRepository({
            storage,
            bus: makeBus(network, windowId),
            now: time.now,
            newId,
            scheduler,
            interfaceLanguage: 'nl',
        });

        return { repository, scheduler };
    };

    return { storage, time, a: make('a'), b: make('b') };
}

function collect(session: EditionSession): SessionEvent[] {
    const events: SessionEvent[] = [];
    session.subscribe((event) => events.push(event));

    return events;
}

async function openIn(repository: EditionRepository, id: string): Promise<EditionSession> {
    const session = await repository.open(id);
    if (session === undefined) throw new Error('edition missing');

    return session;
}

const open = (w: ReturnType<typeof setup>['a'], id: string) => openIn(w.repository, id);

describe('autosave', () => {
    it('saves after the debounce, not on every change', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const spy = vi.spyOn(storage, 'applyPatch');
        const session = await open(a, edition.id);

        session.apply([changeOf(session.edition, 'space.01', { name: 'S' })]);
        session.apply([changeOf(session.edition, 'space.01', { name: 'St' })]);
        session.apply([changeOf(session.edition, 'space.01', { name: 'Stadspark' })]);
        expect(a.scheduler.size).toBe(1);
        expect(session.dirty).toBe(true);
        expect(spy).not.toHaveBeenCalled();

        a.scheduler.run();
        await settle();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(session.dirty).toBe(false);
        expect((await storage.getEdition(edition.id))?.elements['space.01']).toEqual({ name: 'Stadspark' });
    });

    it('sends only the changed elements, with the revision it started from', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const spy = vi.spyOn(storage, 'applyPatch');
        const session = await open(a, edition.id);
        session.apply([
            changeOf(session.edition, 'space.01', { name: 'A' }),
            changeOf(session.edition, 'card.chance.02', { text: 'x' }),
        ]);
        await session.flush();
        session.apply([changeOf(session.edition, 'space.03', { name: 'B' })]);
        await session.flush();

        expect(spy.mock.calls[0]?.[1]).toEqual({
            baseRevision: 0,
            elements: { 'space.01': { name: 'A' }, 'card.chance.02': { text: 'x' } },
        });
        expect(spy.mock.calls[1]?.[1]).toEqual({ baseRevision: 1, elements: { 'space.03': { name: 'B' } } });
        expect((await storage.getEdition(edition.id))?.revision).toBe(2);
        expect(session.edition.revision).toBe(2);
    });

    it('does nothing when there is nothing to save', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const spy = vi.spyOn(storage, 'applyPatch');
        const session = await open(a, edition.id);
        await session.flush();
        expect(spy).not.toHaveBeenCalled();
    });

    it('saves settings changes and renames too', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        session.applySettings(setPart(session.edition, 'money', true));
        session.replace(rename(session.edition, 'Kerst'));
        await session.flush();
        expect(await storage.getEdition(edition.id)).toMatchObject({ name: 'Kerst', parts: { money: true } });
    });

    it('announces saving and saved, and changes', async () => {
        const { a } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        const events = collect(session);
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.flush();
        expect(events.map((event) => event.type)).toEqual(['change', 'saving', 'saved']);
    });

    it('reports a full browser and keeps the changes to try again', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        const events = collect(session);
        storage.writeError = new DOMException('full', 'QuotaExceededError');
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.flush();
        expect(events.at(-1)).toMatchObject({ type: 'save-failed', quotaExceeded: true });
        expect(session.dirty).toBe(true);

        storage.writeError = null;
        await session.flush();
        expect(events.at(-1)?.type).toBe('saved');
        expect(session.dirty).toBe(false);
    });

    it('flags other failures as not a quota problem', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        const events = collect(session);
        storage.writeError = new Error('boom');
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.flush();
        expect(events.at(-1)).toMatchObject({ type: 'save-failed', quotaExceeded: false });
    });

    it('saves changes made while a save is running', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        const first = session.flush();
        session.apply([changeOf(session.edition, 'space.03', { name: 'B' })]);
        await first;
        a.scheduler.run();
        await settle();
        expect((await storage.getEdition(edition.id))?.elements).toEqual({
            'space.01': { name: 'A' },
            'space.03': { name: 'B' },
        });
    });

    it('undoes and redoes, saving the result', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.flush();
        expect(session.canUndo).toBe(true);
        expect(session.undo()).toBe(true);
        await session.flush();
        expect((await storage.getEdition(edition.id))?.elements).toEqual({});
        expect(session.canRedo).toBe(true);
        expect(session.redo()).toBe(true);
        await session.flush();
        expect((await storage.getEdition(edition.id))?.elements['space.01']).toEqual({ name: 'A' });
        expect(session.redo()).toBe(false);
    });

    it('undoes a theme change including its layouts', async () => {
        const { a } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        session.apply([changeOf(session.edition, 'space.01', { layout: 'full', photo: photo() })]);
        session.applySettings(changeTheme(session.edition, 'riso'));
        expect(session.edition.elements['space.01']?.layout).toBe('frame');
        session.undo();
        expect(session.edition.elements['space.01']?.layout).toBe('full');
    });

    it('saves what is pending when it is closed', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.close();
        expect((await storage.getEdition(edition.id))?.elements['space.01']).toEqual({ name: 'A' });
        expect(a.scheduler.size).toBe(0);
    });
});

describe('two windows', () => {
    it('follows the other window silently when nothing is unsaved here', async () => {
        const { a, b } = setup();
        const edition = await a.repository.create(input);
        const sa = await open(a, edition.id);
        const sb = await open(b, edition.id);
        const events = collect(sb);

        sa.apply([changeOf(sa.edition, 'space.01', { name: 'Stadspark' })]);
        await sa.flush();
        await settle();

        expect(events.map((event) => event.type)).toEqual(['remote-update']);
        expect(sb.edition.elements['space.01']).toEqual({ name: 'Stadspark' });
        expect(sb.edition.revision).toBe(1);
        expect(sb.conflict).toBeNull();
        expect(sb.canUndo).toBe(false);

        sb.apply([changeOf(sb.edition, 'space.02', { name: 'x' })]);
        await sb.flush();
        expect(sb.conflict).toBeNull();
    });

    it('asks which version to keep when both windows changed things (Staten design)', async () => {
        const { a, b, storage, time } = setup();
        const edition = await a.repository.create(input);
        const sa = await open(a, edition.id);
        const sb = await open(b, edition.id);
        const eventsB = collect(sb);

        time.set(2_000);
        sa.apply([
            changeOf(sa.edition, 'card.chance.01', { text: 'een' }),
            changeOf(sa.edition, 'card.chest.02', { text: 'twee' }),
        ]);
        await sa.flush();

        time.set(3_000);
        sb.apply([changeOf(sb.edition, 'space.01', { name: 'Stadspark' })]);
        await settle();

        const conflict = sb.conflict;
        expect(conflict).not.toBeNull();
        expect(conflict).toMatchObject({
            editionId: edition.id,
            editionName: 'Zaterdagclub',
            mine: { at: 3_000, summary: 'Stadspark aangepast' },
            theirs: { at: 2_000, summary: '2 kaarten aangepast' },
        });
        expect(eventsB.some((event) => event.type === 'conflict')).toBe(true);

        // Nothing was overwritten, and autosave waits for the answer.
        time.set(4_000);
        sb.apply([changeOf(sb.edition, 'space.03', { name: 'Meer' })]);
        expect(b.scheduler.size).toBe(0);
        await sb.flush();
        const stored = await storage.getEdition(edition.id);
        expect(stored?.elements['space.01']).toBeUndefined();
        expect(stored?.elements['card.chance.01']).toEqual({ text: 'een' });
    });

    it('catches a conflict at save time even without a broadcast', async () => {
        const { storage, time } = setup();
        const noChannel = (id: string) =>
            new EditionRepository({
                storage,
                bus: makeBus(null, id),
                now: time.now,
                newId: counter(id),
                scheduler: new ManualScheduler(),
            });
        const ra = noChannel('a');
        const rb = noChannel('b');
        const edition = await ra.create(input);
        const sa = await openIn(ra, edition.id);
        const sb = await openIn(rb, edition.id);
        sa.apply([changeOf(sa.edition, 'space.01', { name: 'A' })]);
        await sa.flush();
        sb.apply([changeOf(sb.edition, 'space.03', { name: 'B' })]);
        await sb.flush();

        expect(sb.conflict?.theirs.summary).toBe('A aangepast');
        expect(sb.conflict?.mine.summary).toBe('B aangepast');
        expect((await storage.getEdition(edition.id))?.elements['space.03']).toBeUndefined();
    });

    it('keeps the other version on "Die van het andere venster"', async () => {
        const { a, b, storage } = setup();
        const edition = await a.repository.create(input);
        const sa = await open(a, edition.id);
        const sb = await open(b, edition.id);
        const eventsB = collect(sb);
        sa.apply([changeOf(sa.edition, 'card.chance.01', { text: 'een' })]);
        await sa.flush();
        sb.apply([changeOf(sb.edition, 'space.01', { name: 'Stadspark' })]);
        await settle();

        await sb.resolveConflict('theirs');
        expect(sb.conflict).toBeNull();
        expect(sb.dirty).toBe(false);
        expect(sb.edition.elements).toEqual({ 'card.chance.01': { text: 'een' } });
        expect(eventsB.at(-1)?.type).toBe('remote-update');
        expect((await storage.getEdition(edition.id))?.revision).toBe(1);
    });

    it('writes this window on top of the other when asked ("Deze houden")', async () => {
        const { a, b, storage } = setup();
        const edition = await a.repository.create(input);
        const sa = await open(a, edition.id);
        const sb = await open(b, edition.id);
        sa.apply([changeOf(sa.edition, 'card.chance.01', { text: 'een' })]);
        await sa.flush();
        sb.apply([changeOf(sb.edition, 'space.01', { name: 'Stadspark' })]);
        await settle();
        expect(sb.conflict).not.toBeNull();

        await sb.resolveConflict('mine');
        expect(sb.conflict).toBeNull();
        const stored = await storage.getEdition(edition.id);
        expect(stored?.revision).toBe(2);
        expect(stored?.elements).toEqual({ 'space.01': { name: 'Stadspark' } });
        expect(sb.dirty).toBe(false);

        // The first window now follows silently.
        await settle();
        expect(sa.edition.elements).toEqual({ 'space.01': { name: 'Stadspark' } });
    });

    it('does nothing when resolving without a conflict', async () => {
        const { a } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        await session.resolveConflict('mine');
        await session.resolveConflict('theirs');
        expect(session.edition.elements).toEqual({});
    });

    it('tells an open window when the edition is deleted elsewhere', async () => {
        const { a, b } = setup();
        const edition = await a.repository.create(input);
        const sb = await open(b, edition.id);
        const events = collect(sb);
        await a.repository.delete(edition.id);
        await settle();
        expect(events.map((event) => event.type)).toEqual(['remote-delete']);

        sb.apply([changeOf(sb.edition, 'space.01', { name: 'A' })]);
        expect(b.scheduler.size).toBe(0);
        await sb.flush();
        expect(events.map((event) => event.type)).toEqual(['remote-delete', 'change']);
    });

    it('notices a deletion at save time too', async () => {
        const { storage, time } = setup();
        const repo = new EditionRepository({
            storage,
            bus: makeBus(null, 'a'),
            now: time.now,
            newId: counter('x'),
            scheduler: new ManualScheduler(),
        });
        const edition = await repo.create(input);
        const session = await openIn(repo, edition.id);
        const events = collect(session);
        await storage.deleteEdition(edition.id);
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.flush();
        expect(events.at(-1)?.type).toBe('remote-delete');
    });

    it('ignores messages about other editions and about the list', async () => {
        const { a, b } = setup();
        const one = await a.repository.create(input);
        const two = await a.repository.create({ ...input, name: 'Twee' });
        const sb = await open(b, one.id);
        const events = collect(sb);
        const other = await open(a, two.id);
        other.apply([changeOf(other.edition, 'space.01', { name: 'A' })]);
        await other.flush();
        await a.repository.rename(two.id, 'Hernoemd');
        await settle();
        expect(events).toEqual([]);
    });
});
