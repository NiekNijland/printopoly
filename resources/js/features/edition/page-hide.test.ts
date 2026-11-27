import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { MemoryEditionStorage } from '../../lib/render/edition-storage';
import {
    ManualScheduler,
    changeOf,
    clock,
    counter,
    createFakeNetwork,
    makeBus,
    settle,
} from '../../testing/edition-test-utils';
import { saveOnPageHide } from './page-hide';
import { EditionRepository } from './repository';

const openSession = async () => {
    const storage = new MemoryEditionStorage();
    const scheduler = new ManualScheduler();
    const repository = new EditionRepository({
        storage,
        bus: makeBus(createFakeNetwork(), 'a'),
        now: clock(1_000).now,
        newId: counter('id'),
        scheduler,
        interfaceLanguage: 'nl',
    });
    const edition = await repository.create({
        name: 'Zaterdagclub',
        language: 'nl',
        theme: 'classic',
        boardProfile: DEFAULT_BOARD_PROFILE,
    });
    const session = await repository.open(edition.id);
    if (session === undefined) throw new Error('edition missing');

    return { session, storage, scheduler };
};

const state = (value: DocumentVisibilityState): DocumentVisibilityState =>
    value;

describe('saveOnPageHide (bug 3)', () => {
    it('saves a change within the pause when the page is hidden', async () => {
        const { session, storage } = await openSession();
        const target = new EventTarget();
        const page = Object.assign(new EventTarget(), {
            visibilityState: state('visible'),
        });
        const stop = saveOnPageHide(session, target, page);

        session.apply([
            changeOf(session.edition, 'space.01', { name: 'Kerkplein' }),
        ]);
        page.visibilityState = 'hidden';
        page.dispatchEvent(new Event('visibilitychange'));
        await settle();

        const stored = await storage.getEdition(session.edition.id);
        expect(stored?.elements['space.01']?.name).toBe('Kerkplein');
        stop();
    });

    it('saves on pagehide, and not when the page only becomes visible', async () => {
        const { session, storage } = await openSession();
        const target = new EventTarget();
        const page = Object.assign(new EventTarget(), {
            visibilityState: state('visible'),
        });
        const stop = saveOnPageHide(session, target, page);

        session.apply([
            changeOf(session.edition, 'space.01', { name: 'Dorpsstraat' }),
        ]);
        page.dispatchEvent(new Event('visibilitychange'));
        await settle();
        expect(
            (await storage.getEdition(session.edition.id))?.elements[
                'space.01'
            ],
        ).toBeUndefined();

        target.dispatchEvent(new Event('pagehide'));
        await settle();
        expect(
            (await storage.getEdition(session.edition.id))?.elements['space.01']
                ?.name,
        ).toBe('Dorpsstraat');
        stop();
    });

    it('stops listening after cleanup', async () => {
        const { session, storage } = await openSession();
        const target = new EventTarget();
        const page = Object.assign(new EventTarget(), {
            visibilityState: state('hidden'),
        });
        saveOnPageHide(session, target, page)();

        session.apply([
            changeOf(session.edition, 'space.01', { name: 'Molenweg' }),
        ]);
        target.dispatchEvent(new Event('pagehide'));
        await settle();
        expect(
            (await storage.getEdition(session.edition.id))?.elements[
                'space.01'
            ],
        ).toBeUndefined();
    });
});
