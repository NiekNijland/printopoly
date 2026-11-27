import { useEffect, useState } from 'react';

import type { PrintServices } from '@/features/print/print-page-setup';
import { reportError } from '@/lib/bugsnag';
import type { Edition } from '@/lib/render/edition-types';
import type { PrintJobData } from '@/types/generated';

/**
 * The edition as the editor has it, for the open Controle messages in the bar (UX 7, B179). On the page of a
 * job it is read from this browser as well; without it the bar says nothing about the Controle. Before a job
 * the edition is the local one, loaded by `useLocalPrintEdition`, so nothing is read here then.
 */
export const useStoredEdition = (
    job: PrintJobData | null,
    localEditionId: string | null,
    services: PrintServices,
): [Edition | null, (edition: Edition) => void] => {
    const [stored, setStored] = useState<Edition | null>(null);

    useEffect(() => {
        if (job === null || localEditionId === null) {
            return undefined;
        }
        let cancelled = false;
        services
            .loadEdition()
            .then((found) => {
                if (!cancelled) {
                    setStored(found ?? null);
                }
            })
            .catch(reportError);

        return () => {
            cancelled = true;
        };
    }, [job, localEditionId, services]);

    return [stored, setStored];
};
