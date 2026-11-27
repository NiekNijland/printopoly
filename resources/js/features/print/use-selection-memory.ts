import { useState } from 'react';

import type { PrintServices } from '@/features/print/print-page-setup';
import type { Edition, PrintSelection } from '@/lib/render/edition-types';
import type { PrintJobData } from '@/types/generated';

type SelectionMemory = {
    /** What goes in the set, as chosen on this page; null until a tick changes it (B198). */
    chosen: PrintSelection | null;
    /** The choice could not be kept on the edition in this browser; printing goes on. */
    rememberFailed: boolean;
    keep: (next: PrintSelection) => void;
};

/**
 * Keeps what goes in the set on the edition in this browser (B198), where the editor reads it. A job made for
 * the edition as it was stays the job for it: the choice of parts does not change what is printed on them.
 */
export const useSelectionMemory = (
    job: PrintJobData | null,
    checked: Edition | null,
    services: PrintServices,
    saved: (edition: Edition) => void,
): SelectionMemory => {
    const [chosen, setChosen] = useState<PrintSelection | null>(null);
    const [rememberFailed, setRememberFailed] = useState(false);

    const remember = (next: PrintSelection): void => {
        const id = checked?.id;

        if (id === undefined) {
            return;
        }

        const before = checked?.revision ?? 0;

        services
            .keepSelection(id, next)
            .then(async (edition) => {
                if (edition === undefined) {
                    return;
                }
                saved(edition);
                if (job !== null) {
                    await services.carryJob(
                        job.token,
                        id,
                        before,
                        edition.revision,
                    );
                }
                setRememberFailed(false);
            })
            .catch(() => {
                setRememberFailed(true);
            });
    };

    const keep = (next: PrintSelection): void => {
        setChosen(next);
        remember(next);
    };

    return { chosen, rememberFailed, keep };
};
