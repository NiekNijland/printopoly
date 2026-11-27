import { EditionBus } from '@/features/edition/bus';
import { EditionSession } from '@/features/edition/session';
import { now } from '@/lib/clock';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { mediaQueryList } from '@/testing/media-query';

export const openWorkspace = async (
    parts: Record<string, boolean> = {},
    elements: ReturnType<typeof sampleEdition>['elements'] = {},
    extra: Record<string, unknown> = {},
) => {
    const services = installMemoryServices();
    const base = sampleEdition();
    const edition = {
        ...base,
        ...extra,
        parts: { ...base.parts, ...parts },
        elements: { ...base.elements, ...elements },
    };
    await services.storage.createEdition(edition);
    const session = new EditionSession(edition, {
        storage: services.storage,
        bus: new EditionBus(null, 'w'),
        now,
        debounceMs: 5,
    });

    return { session, services };
};

/** A tablet upright: wide enough for two columns, and the preview folds (B173). */
export const tabletUpright = () =>
    vi
        .spyOn(window, 'matchMedia')
        .mockImplementation((query: string) =>
            mediaQueryList(
                query,
                query.includes('min-width: 768px') ||
                    query.includes('max-width: 1023.98px'),
            ),
        );
