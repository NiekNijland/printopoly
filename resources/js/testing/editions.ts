import { EditionBus } from '@/features/edition/bus';
import type { EditorServices } from '@/features/edition/editor/services';
import { setServices } from '@/features/edition/editor/testing/services';
import { EditionRepository } from '@/features/edition/repository';
import { createEdition } from '@/lib/render/edition-changes';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { Edition, NewEditionInput } from '@/lib/render/edition-types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';

/** Installs in-memory services, so pages and hooks work without a browser database. */
export const installMemoryServices = (): EditorServices & {
    storage: MemoryEditionStorage;
} => {
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
};

export const sampleEdition = (
    overrides: Partial<NewEditionInput> & { id?: string } = {},
): Edition => {
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
};
