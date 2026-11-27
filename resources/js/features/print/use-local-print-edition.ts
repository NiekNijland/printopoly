import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import type { PrintServices } from '@/features/print/print-page-setup';
import type { Edition } from '@/lib/render/edition-types';
import { findReusableJob } from '@/lib/render/print-api';
import { show as printShow } from '@/routes/print';
import type { Locale } from '@/types/game';
import type { PrintJobData } from '@/types/generated';

type LocalPrintEdition = {
    local: Edition | null;
    setLocal: (edition: Edition) => void;
    /** Before a job exists: whether this browser has one for this revision already (bug 9 of test round 3). */
    reusing: boolean;
    /**
     * This browser printed the edition before, and it changed since: the set is made again by itself, so there is
     * never an old set to download (Niek, 22 nov).
     */
    remake: boolean;
};

/**
 * Before a job exists the edition is in this browser (B80): draw the parts from it, or open the job this
 * browser already made for it when the edition has not changed since.
 */
export const useLocalPrintEdition = (
    job: PrintJobData | null,
    services: PrintServices,
    locale: Locale,
): LocalPrintEdition => {
    const [local, setLocal] = useState<Edition | null>(null);
    const [reusing, setReusing] = useState(job === null);
    const [remake, setRemake] = useState(false);

    useEffect(() => {
        if (job !== null) {
            return;
        }

        let cancelled = false;
        const storage = services.storage();

        services
            .loadEdition()
            .then(async (found) => {
                if (cancelled || found === undefined) {
                    return null;
                }

                setLocal(found);

                const token = await findReusableJob(
                    found.id,
                    found.revision,
                    storage,
                );
                const printedBefore =
                    token === null &&
                    (await storage.listPrintJobs().catch(() => [])).some(
                        (record) => record.editionId === found.id,
                    );

                return { token, printedBefore };
            })
            .then((found) => {
                if (cancelled || found === null) {
                    if (!cancelled) {
                        setReusing(false);
                    }

                    return;
                }

                const { token, printedBefore } = found;

                if (token === null) {
                    setRemake(printedBefore);
                    setReusing(false);

                    return;
                }

                router.visit(printShow({ locale, printJob: token }).url, {
                    replace: true,
                });
            })
            .catch(() => {
                if (!cancelled) {
                    setReusing(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [job, services, locale]);

    return { local, setLocal, reusing, remake };
};
