import { rename, setPart } from '@/lib/render/edition-settings';
import { CorruptEditionError } from '@/lib/render/edition-storage';
import { changeOf, settle } from '@/testing/edition-test-utils';

import { collect, input, open, setup } from './testing/session';

describe('autosave', () => {
    it('saves after the debounce, not on every change', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const spy = vi.spyOn(storage, 'applyPatch');
        const session = await open(a, edition.id);

        session.apply([changeOf(session.edition, 'space.01', { name: 'S' })]);
        session.apply([changeOf(session.edition, 'space.01', { name: 'St' })]);
        session.apply([
            changeOf(session.edition, 'space.01', { name: 'Stadspark' }),
        ]);
        expect(a.scheduler.size).toBe(1);
        expect(session.dirty).toBe(true);
        expect(spy).not.toHaveBeenCalled();

        a.scheduler.run();
        await settle();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(session.dirty).toBe(false);
        expect(
            (await storage.getEdition(edition.id))?.elements['space.01'],
        ).toEqual({ name: 'Stadspark' });
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
            elements: {
                'space.01': { name: 'A' },
                'card.chance.02': { text: 'x' },
            },
        });
        expect(spy.mock.calls[1]?.[1]).toEqual({
            baseRevision: 1,
            elements: { 'space.03': { name: 'B' } },
        });
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
        expect(await storage.getEdition(edition.id)).toMatchObject({
            name: 'Kerst',
            parts: { money: true },
        });
    });

    it('announces saving and saved, and changes', async () => {
        const { a } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        const events = collect(session);
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.flush();
        expect(events.map((event) => event.type)).toEqual([
            'change',
            'saving',
            'saved',
        ]);
    });

    it('reports a full browser and keeps the changes to try again', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        const events = collect(session);
        storage.writeError = new DOMException('full', 'QuotaExceededError');
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.flush();
        expect(events.at(-1)).toMatchObject({
            type: 'save-failed',
            quotaExceeded: true,
        });
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
        expect(events.at(-1)).toMatchObject({
            type: 'save-failed',
            quotaExceeded: false,
            corrupt: false,
        });
    });

    it('says so when the stored edition is damaged, not that the browser blocks storage', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        const events = collect(session);
        storage.writeError = new CorruptEditionError(edition.id, ['theme']);
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.flush();
        expect(events.at(-1)).toMatchObject({
            type: 'save-failed',
            quotaExceeded: false,
            corrupt: true,
        });
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
        expect(
            (await storage.getEdition(edition.id))?.elements['space.01'],
        ).toEqual({ name: 'A' });
        expect(session.redo()).toBe(false);
    });

    it('saves what is pending when it is closed', async () => {
        const { a, storage } = setup();
        const edition = await a.repository.create(input);
        const session = await open(a, edition.id);
        session.apply([changeOf(session.edition, 'space.01', { name: 'A' })]);
        await session.close();
        expect(
            (await storage.getEdition(edition.id))?.elements['space.01'],
        ).toEqual({ name: 'A' });
        expect(a.scheduler.size).toBe(0);
    });
});
