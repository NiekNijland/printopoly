import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';

import type { PrintPart, PrintSet } from '@/types/generated';

/** How long to wait before asking again when the server still has a run going. */
const QUEUE_RETRY_MS = 5000;

type QueuedPart = {
    set: PrintSet;
    part: PrintPart;
};

/** What starting a run came to: started, still busy on the server (409), or failed for another reason. */
export type StartOutcome = 'started' | 'busy' | 'failed';

type PrintQueue = {
    queue: QueuedPart[];
    /** Whether the part waits in this browser for the run before it. The test sheet has one row for both sets. */
    isQueued: (set: PrintSet, part: PrintPart) => boolean;
    enqueue: (set: PrintSet, parts: PrintPart[]) => void;
    remove: (set: PrintSet, part: PrintPart) => void;
};

const same = (entry: QueuedPart, set: PrintSet, part: PrintPart): boolean =>
    entry.part === part && (part === 'calibration' || entry.set === set);

type QueueState = {
    queue: QueuedPart[];
    holding: boolean;
    starting: boolean;
};

type Start = (set: PrintSet, parts: PrintPart[]) => Promise<StartOutcome>;

const createQueueStore = () => {
    let state: QueueState = { queue: [], holding: false, starting: false };
    const listeners = new Set<() => void>();
    const update = (next: Partial<QueueState>): void => {
        state = { ...state, ...next };
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
        snapshot: (): QueueState => state,
        enqueue: (set: PrintSet, parts: PrintPart[]): void => {
            update({
                queue: [
                    ...state.queue,
                    ...parts
                        .filter(
                            (part) =>
                                !state.queue.some((entry) =>
                                    same(entry, set, part),
                                ),
                        )
                        .map((part) => ({ set, part })),
                ],
            });
        },
        remove: (set: PrintSet, part: PrintPart): void => {
            update({
                queue: state.queue.filter((entry) => !same(entry, set, part)),
            });
        },
        release: (): void => {
            update({ holding: false });
        },
        startNext: (start: Start): void => {
            const first = state.queue[0];

            if (state.holding || state.starting || first === undefined) {
                return;
            }

            // One run takes every part waiting for the set of the first in line.
            const set = first.set;
            const taken = state.queue.filter((entry) => entry.set === set);
            update({
                starting: true,
                queue: state.queue.filter((entry) => entry.set !== set),
            });

            void start(
                set,
                taken.map((entry) => entry.part),
            )
                .then((outcome) => {
                    if (outcome === 'busy') {
                        update({
                            queue: [...taken, ...state.queue],
                            holding: true,
                        });
                    }
                })
                .finally(() => {
                    update({ starting: false });
                });
        },
    };
};

/**
 * The parts the user asked for while a run is going. The server makes one run at a time per job (B70), so
 * the browser keeps the rest and starts it as soon as the run before it is done. A server that still says
 * busy (409) gets asked again after a few seconds, with the parts still in line.
 */
export const usePrintQueue = (ready: boolean, start: Start): PrintQueue => {
    const [store] = useState(createQueueStore);
    const state = useSyncExternalStore(
        store.subscribe,
        store.snapshot,
        store.snapshot,
    );
    const { queue, holding } = state;
    const startRef = useRef(start);

    useEffect(() => {
        startRef.current = start;
    }, [start]);

    useEffect(() => {
        if (ready) {
            store.startNext(startRef.current);
        }
    }, [ready, store, state]);

    useEffect(() => {
        if (!holding) {
            return;
        }

        const timer = window.setTimeout(store.release, QUEUE_RETRY_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [holding, store]);

    const isQueued = useCallback(
        (set: PrintSet, part: PrintPart) =>
            queue.some((entry) => same(entry, set, part)),
        [queue],
    );

    return { queue, isQueued, enqueue: store.enqueue, remove: store.remove };
};
