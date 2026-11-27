import type { ReactNode } from 'react';

import { EditionBus } from '@/features/edition/bus';
import { EditionSession } from '@/features/edition/session';
import { useSessionSnapshot } from '@/features/edition/use-edition-session';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { Edition } from '@/lib/render/edition-types';

export const memorySession = (edition: Edition): EditionSession =>
    new EditionSession(edition, {
        storage: new MemoryEditionStorage(),
        bus: new EditionBus(null, 'w'),
        now: () => 5,
        debounceMs: 1000,
    });

export const LiveEdition = ({
    session,
    children,
}: {
    session: EditionSession;
    children: (edition: Edition) => ReactNode;
}) => {
    const { edition } = useSessionSnapshot(session);

    return children(edition);
};
