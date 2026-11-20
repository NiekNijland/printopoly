import { EditionBus, browserChannelFactory } from '@/lib/edition/bus';
import {
    browserEnvironmentDeps,
    detectEnvironment,
    type EnvironmentInfo,
} from '@/lib/edition/environment';
import { IndexedDbEditionStorage } from '@/lib/edition/indexeddb-storage';
import { EditionRepository } from '@/lib/edition/repository';
import {
    MemoryEditionStorage,
    type EditionStorage,
} from '@/lib/edition/storage';
import type { Locale } from '@/lib/game/types';

/** Everything the pages share in one browser window: where editions are stored and how windows talk. */
export interface EditorServices {
    repository: EditionRepository;
    bus: EditionBus;
    storage: EditionStorage;
    /** False when IndexedDB is not available and editions live in memory only. */
    persistent: boolean;
}

function createStorage(): {
    storage: EditionStorage;
    persistent: boolean;
} {
    if (typeof indexedDB === 'undefined') {
        return { storage: new MemoryEditionStorage(), persistent: false };
    }

    return {
        storage: new IndexedDbEditionStorage(indexedDB),
        persistent: true,
    };
}

function createServices(locale: Locale): EditorServices {
    const { storage, persistent } = createStorage();
    const bus = new EditionBus(browserChannelFactory(), crypto.randomUUID());
    const repository = new EditionRepository({
        storage,
        bus,
        now: () => Date.now(),
        newId: () => crypto.randomUUID(),
        interfaceLanguage: locale,
    });

    return { repository, bus, storage, persistent };
}

let shared: EditorServices | null = null;

/** One set of services per window. The interface language is fixed per page load (a switch reloads). */
export function getServices(locale: Locale): EditorServices {
    shared ??= createServices(locale);

    return shared;
}

/** For tests. */
export function setServices(services: EditorServices | null): void {
    shared = services;
}

let environment: Promise<EnvironmentInfo> | null = null;

/** What the browser says about storage: private window, Safari clean-up, free space (B92). */
export function getEnvironment(): Promise<EnvironmentInfo> {
    environment ??= detectEnvironment(browserEnvironmentDeps());

    return environment;
}
