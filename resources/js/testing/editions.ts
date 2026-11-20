import { EditionBus } from '@/lib/edition/bus';
import { createEdition } from '@/lib/edition/changes';
import { EditionRepository } from '@/lib/edition/repository';
import { MemoryEditionStorage } from '@/lib/edition/storage';
import type { Edition, NewEditionInput } from '@/lib/edition/types';
import { setServices, type EditorServices } from '@/lib/editor/services';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';

/** Installs in-memory services, so pages and hooks work without a browser database. */
export function installMemoryServices(): EditorServices & {
    storage: MemoryEditionStorage;
} {
    const storage = new MemoryEditionStorage();
    const bus = new EditionBus(null, 'test-window');
    let counter = 0;
    const repository = new EditionRepository({
        storage,
        bus,
        now: () => Date.now(),
        newId: () => `id-${String(++counter)}-test-edition`,
        debounceMs: 5,
        interfaceLanguage: 'nl',
    });
    const services = { repository, bus, persistent: false, storage };
    setServices(services);

    return services;
}

export function sampleEdition(
    overrides: Partial<NewEditionInput> & { id?: string } = {},
): Edition {
    const { id = 'sample-edition-1', ...input } = overrides;

    return createEdition(
        {
            name: 'Zaterdagclub',
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
            ...input,
        },
        { id, now: 1_000 },
    );
}
