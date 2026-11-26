import {
    ManualScheduler,
    changeOf,
    counter,
    makeBus,
    makeEdition,
    settle,
} from '@/testing/edition-test-utils';

import { EditionRepository } from './repository';
import { buildConflict } from './session-conflict';
import { summarizeDifference } from './summary';
import { collect, input, open, openIn, setup } from './testing/session';

describe('buildConflict', () => {
    it('names both versions with when they changed and what changed', () => {
        const saved = makeEdition({ id: 'e1', name: 'Zaterdagclub' });
        const mine = {
            ...saved,
            elements: { 'space.02': { name: 'Kerkpad' } },
        };
        const theirs = { ...saved, updatedAt: 77 };

        expect(
            buildConflict(saved, { edition: mine, at: 55 }, theirs, 'nl'),
        ).toEqual({
            editionId: 'e1',
            editionName: 'Zaterdagclub',
            mine: { at: 55, summary: summarizeDifference(saved, mine, 'nl') },
            theirs: {
                at: 77,
                summary: summarizeDifference(saved, theirs, 'nl'),
            },
            theirsEdition: theirs,
        });
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
        expect(
            (await storage.getEdition(edition.id))?.elements['space.03'],
        ).toBeUndefined();
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
        expect(sb.edition.elements).toEqual({
            'card.chance.01': { text: 'een' },
        });
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
        expect(sa.edition.elements).toEqual({
            'space.01': { name: 'Stadspark' },
        });
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
        expect(events.map((event) => event.type)).toEqual([
            'remote-delete',
            'change',
        ]);
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
