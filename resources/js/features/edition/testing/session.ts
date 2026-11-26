import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import {
    ManualScheduler,
    clock,
    counter,
    createFakeNetwork,
    makeBus,
} from '@/testing/edition-test-utils';

import { EditionRepository } from '../repository';
import type { EditionSession, SessionEvent } from '../session';

export const input = {
    name: 'Zaterdagclub',
    language: 'nl',
    theme: 'classic',
    boardProfile: DEFAULT_BOARD_PROFILE,
} as const;

/** Two windows on one browser: same storage, one shared channel network. */
export const setup = () => {
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
};

export const collect = (session: EditionSession): SessionEvent[] => {
    const events: SessionEvent[] = [];
    session.subscribe((event) => events.push(event));

    return events;
};

export const openIn = async (
    repository: EditionRepository,
    id: string,
): Promise<EditionSession> => {
    const session = await repository.open(id);
    if (session === undefined) throw new Error('edition missing');

    return session;
};

export const open = (w: ReturnType<typeof setup>['a'], id: string) =>
    openIn(w.repository, id);
