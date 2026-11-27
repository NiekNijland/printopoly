import { EditionBus, browserChannelFactory } from '@/features/edition/bus';
import { servicesCache } from '@/features/edition/editor/services-cache';
import {
    browserEnvironmentDeps,
    detectEnvironment,
    type EnvironmentInfo,
} from '@/features/edition/environment';
import { IndexedDbEditionStorage } from '@/features/edition/indexeddb-storage';
import { EditionRepository } from '@/features/edition/repository';
import { countFeature } from '@/lib/feature-count';
import {
    MemoryEditionStorage,
    type EditionStorage,
} from '@/lib/render/edition-storage';
import type { Locale } from '@/types/game';

/** Everything the pages share in one browser window: where editions are stored and how windows talk. */
export type EditorServices = {
    repository: EditionRepository;
    bus: EditionBus;
    storage: EditionStorage;
    /** False when IndexedDB is not available and editions live in memory only. */
    persistent: boolean;
};

const createStorage = (): {
    storage: EditionStorage;
    persistent: boolean;
} => {
    if (typeof indexedDB === 'undefined') {
        return { storage: new MemoryEditionStorage(), persistent: false };
    }

    return {
        storage: new IndexedDbEditionStorage(indexedDB),
        persistent: true,
    };
};

const createServices = (locale: Locale): EditorServices => {
    const { storage, persistent } = createStorage();
    const bus = new EditionBus(browserChannelFactory(), crypto.randomUUID());
    const repository = new EditionRepository({
        storage,
        bus,
        now: () => Date.now(),
        newId: () => crypto.randomUUID(),
        interfaceLanguage: locale,
        count: countFeature,
    });

    return { repository, bus, storage, persistent };
};

/** One set of services per window. The interface language is fixed per page load (a switch reloads). */
export const getServices = (locale: Locale): EditorServices => {
    servicesCache.services ??= createServices(locale);

    return servicesCache.services;
};

/** What the browser says about storage: private window, Safari clean-up, free space (B92). */
export const getEnvironment = (): Promise<EnvironmentInfo> => {
    servicesCache.environment ??= detectEnvironment(browserEnvironmentDeps());

    return servicesCache.environment;
};
