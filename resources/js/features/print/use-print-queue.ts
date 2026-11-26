import { useCallback, useEffect, useRef, useState } from 'react';

import type { PrintPart, PrintSet } from '@/types/generated';

/** How long to wait before asking again when the server still has a run going. */
const QUEUE_RETRY_MS = 5000;

interface QueuedPart {
    set: PrintSet;
    part: PrintPart;
}

/** What starting a run came to: started, still busy on the server (409), or failed for another reason. */
export type StartOutcome = 'started' | 'busy' | 'failed';

interface PrintQueue {
    queue: QueuedPart[];
    /** Whether the part waits in this browser for the run before it. The test sheet has one row for both sets. */
    isQueued: (set: PrintSet, part: PrintPart) => boolean;
    enqueue: (set: PrintSet, parts: PrintPart[]) => void;
    remove: (set: PrintSet, part: PrintPart) => void;
}

const same = (entry: QueuedPart, set: PrintSet, part: PrintPart): boolean =>
    entry.part === part && (part === 'calibration' || entry.set === set);

/**
 * The parts the user asked for while a run is going. The server makes one run at a time per job (B70), so
 * the browser keeps the rest and starts it as soon as the run before it is done. A server that still says
 * busy (409) gets asked again after a few seconds, with the parts still in line.
 */
export function usePrintQueue(
    ready: boolean,
    start: (set: PrintSet, parts: PrintPart[]) => Promise<StartOutcome>,
): PrintQueue {
    const [queue, setQueue] = useState<QueuedPart[]>([]);
    const [holding, setHolding] = useState(false);
    const [starting, setStarting] = useState(false);
    const startRef = useRef(start);

    useEffect(() => {
        startRef.current = start;
    }, [start]);

    useEffect(() => {
        const first = queue[0];

        if (!ready || holding || starting || first === undefined) {
            return;
        }

        // One run takes every part waiting for the set of the first in line.
        const set = first.set;
        const taken = queue.filter((entry) => entry.set === set);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the line moves on when the server is free, which only an effect sees
        setStarting(true);
        setQueue((current) => current.filter((entry) => entry.set !== set));

        void startRef
            .current(
                set,
                taken.map((entry) => entry.part),
            )
            .then((outcome) => {
                if (outcome === 'busy') {
                    setQueue((current) => [...taken, ...current]);
                    setHolding(true);
                }
            })
            .finally(() => {
                setStarting(false);
            });
    }, [ready, holding, starting, queue]);

    useEffect(() => {
        if (!holding) {
            return;
        }

        const timer = window.setTimeout(() => {
            setHolding(false);
        }, QUEUE_RETRY_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [holding]);

    const isQueued = useCallback(
        (set: PrintSet, part: PrintPart) =>
            queue.some((entry) => same(entry, set, part)),
        [queue],
    );

    const enqueue = useCallback((set: PrintSet, parts: PrintPart[]) => {
        setQueue((current) => [
            ...current,
            ...parts
                .filter(
                    (part) => !current.some((entry) => same(entry, set, part)),
                )
                .map((part) => ({ set, part })),
        ]);
    }, []);

    const remove = useCallback((set: PrintSet, part: PrintPart) => {
        setQueue((current) =>
            current.filter((entry) => !same(entry, set, part)),
        );
    }, []);

    return { queue, isQueued, enqueue, remove };
}
