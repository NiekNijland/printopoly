import { useRef, useState } from 'react';

import { initialChoices, type Choice } from '@/features/print/print-page-setup';
import { reportUnlessOffline } from '@/lib/bugsnag';
import { saveChoices } from '@/lib/render/print-api';
import { choices as choicesRoute } from '@/routes/print';
import type {
    PrintJobData,
    PrintJobStatusData,
    PrintSet,
} from '@/types/generated';

export const usePrintChoices = (
    job: PrintJobData | null,
    setStatus: (status: PrintJobStatusData) => void,
) => {
    const [choices, setChoices] = useState(() => initialChoices(job));

    /**
     * The choices saved one after the other, so the server keeps the last one: "Een set meer" twice sends 2 and
     * then 3, and a run waits for them. Sent side by side, the 2 could land last, during the run, and the cards
     * and money of three sets came out as two.
     */
    const savingChoices = useRef<Promise<unknown>>(Promise.resolve());

    /** Changes the choice of one set, and keeps it on the job when there is one. */
    const choose = (forSet: PrintSet, change: Partial<Choice>): void => {
        const next = { ...choices[forSet], ...change };

        setChoices((current) => ({ ...current, [forSet]: next }));

        if (job === null) {
            return;
        }

        const url = choicesRoute({ printJob: job.token }).url;

        savingChoices.current = savingChoices.current
            .then(() => saveChoices(url, forSet, change))
            .then(setStatus)
            .catch(reportUnlessOffline);
    };

    return { choices, choose, savingChoices };
};
