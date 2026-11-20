import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { EditionSummary } from '@/lib/edition/types';
import { getServices, type EditorServices } from '@/lib/editor/services';

/** The window's edition services (storage, repository, bus), created on first use in the browser. */
export function useServices(): EditorServices {
    const { locale } = usePage().props;

    return useMemo(() => getServices(locale), [locale]);
}

export interface EditionListState {
    /** `null` while loading. */
    editions: EditionSummary[] | null;
    refresh: () => void;
    error: boolean;
}

/** "Mijn edities": the list from this browser, newest first, reloaded when another window changes it. */
export function useEditionList(): EditionListState {
    const { repository, bus } = useServices();
    const [editions, setEditions] = useState<EditionSummary[] | null>(null);
    const [error, setError] = useState(false);
    const [version, setVersion] = useState(0);

    const refresh = useCallback(() => setVersion((value) => value + 1), []);

    useEffect(() => {
        let alive = true;

        repository
            .list()
            .then((list) => {
                if (alive) {
                    setEditions(list);
                    setError(false);
                }
            })
            .catch(() => {
                if (alive) {
                    setError(true);
                    setEditions([]);
                }
            });

        return () => {
            alive = false;
        };
    }, [repository, version]);

    useEffect(
        () =>
            bus.subscribe((message) => {
                if (message.kind !== 'saved') {
                    refresh();
                }
            }),
        [bus, refresh],
    );

    return { editions, refresh, error };
}
