import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { fetchOwnReceipts, type OwnState } from '@/features/edition/boxes/api';
import {
    readFirstName,
    readSent,
    type SentRecord,
} from '@/features/edition/boxes/local';
import { reportUnlessOffline } from '@/lib/bugsnag';

type Stored = {
    firstName: string;
    sent: SentRecord[];
};

const NOTHING_STORED: Stored = { firstName: '', sent: [] };

// Storage only exists in the browser: the server render and the hydration see nothing stored, the browser then reads it.
const createOwnStore = (token: string) => {
    let stored: Stored | null = null;
    const listeners = new Set<() => void>();
    const snapshot = (): Stored => {
        stored ??=
            token === ''
                ? NOTHING_STORED
                : { firstName: readFirstName(), sent: readSent(token) };

        return stored;
    };
    const update = (next: Partial<Stored>): void => {
        stored = { ...snapshot(), ...next };
        listeners.forEach((listener) => {
            listener();
        });
    };

    return {
        subscribe: (listener: () => void): (() => void) => {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
        snapshot,
        setFirstName: (firstName: string): void => {
            update({ firstName });
        },
        add: (record: SentRecord): void => {
            update({ sent: [record, ...snapshot().sent] });
        },
    };
};

export const useOwnRecords = (token: string) => {
    const store = useMemo(() => createOwnStore(token), [token]);
    const { firstName, sent } = useSyncExternalStore(
        store.subscribe,
        store.snapshot,
        () => NOTHING_STORED,
    );
    const [states, setStates] = useState<Record<string, OwnState>>({});

    useEffect(() => {
        const records = store.snapshot().sent;
        if (records.length > 0) {
            fetchOwnReceipts(
                token,
                records.map((record) => record.receipt),
            )
                .then(setStates)
                .catch(reportUnlessOffline);
        }
    }, [store, token]);

    const add = (record: SentRecord): void => {
        store.add(record);
        setStates((map) => ({ ...map, [record.receipt]: 'waiting' }));
    };

    return {
        firstName,
        setFirstName: store.setFirstName,
        sent,
        states,
        add,
    };
};
