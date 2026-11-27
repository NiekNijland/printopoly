import { useEffect, useRef } from 'react';

import { reportUnlessOffline } from '@/lib/bugsnag';
import { fetchStatus } from '@/lib/render/print-api';
import type { PrintJobData, PrintJobStatusData } from '@/types/generated';

/**
 * Back online: catch up on what the server did meanwhile, and send what could not go (bug 12 of test round 4). The
 * request that was lost clears itself when it goes again.
 */
export const useBackOnline = (
    online: boolean,
    lost: { retry: () => void } | null,
    job: PrintJobData | null,
    setStatus: (status: PrintJobStatusData) => void,
): void => {
    const wasOnline = useRef(online);

    useEffect(() => {
        const cameBack = online && !wasOnline.current;
        wasOnline.current = online;

        if (!online) {
            return;
        }

        lost?.retry();

        // Live messages sent while offline are gone: ask the server once where things stand.
        if (cameBack && job !== null) {
            fetchStatus(job.statusUrl)
                .then(setStatus)
                .catch(reportUnlessOffline);
        }
    }, [online, lost, job, setStatus]);
};
