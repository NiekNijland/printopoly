import { useEffect, useState } from 'react';

import { getEcho } from '@/lib/echo';
import { fetchStatus } from '@/lib/print/api';
import type { PrintJobData, PrintJobStatusData } from '@/types/generated';

/** While a run is busy the status is also fetched this often, in case a Reverb message is missed. */
const POLL_MS = 4000;

interface PrintJobState {
    status: PrintJobStatusData;
    /** Replace the status, for example with the answer to starting a run. */
    setStatus: (status: PrintJobStatusData) => void;
}

/**
 * The live status of a print job (B95). It starts from the status the page was rendered with, listens on
 * the job's Reverb channel (private for a job with an account, secret by name for one without), and polls
 * the JSON endpoint while something is waiting or running.
 */
export function usePrintJob(job: PrintJobData | null): PrintJobState {
    const [status, setStatus] = useState<PrintJobStatusData | null>(
        job?.status ?? null,
    );
    const channel = job?.channel;
    const statusUrl = job?.statusUrl;

    useEffect(() => {
        if (channel === undefined) {
            return;
        }

        const echo = getEcho();

        if (echo === null) {
            return;
        }

        const subscription = channel.private
            ? echo.private(channel.name)
            : echo.channel(channel.name);

        subscription.listen('.print.status', (payload: PrintJobStatusData) => {
            setStatus(payload);
        });

        return () => {
            echo.leave(channel.name);
        };
    }, [channel]);

    // Also while the queue makes a missing order sheet outside a run: the ZIP waits for it (B235).
    const busy = status?.busy === true || status?.zipPreparing === true;

    useEffect(() => {
        if (!busy || statusUrl === undefined) {
            return;
        }

        const timer = window.setInterval(() => {
            fetchStatus(statusUrl)
                .then(setStatus)
                .catch(() => undefined);
        }, POLL_MS);

        return () => {
            window.clearInterval(timer);
        };
    }, [busy, statusUrl]);

    return { status: status ?? emptyStatus, setStatus };
}

const emptyStatus: PrintJobStatusData = {
    busy: false,
    printerZipUrl: '',
    homeZipUrl: '',
    printerZipReady: false,
    homeZipReady: false,
    zipPreparing: false,
    parts: [],
};
