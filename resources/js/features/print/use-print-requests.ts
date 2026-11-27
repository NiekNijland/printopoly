import { useEffect, useRef, useState } from 'react';
import { partStatusRow } from '@/features/print/part-status-row';
import type { Choice, PrintServices } from '@/features/print/print-page-setup';
import { useBackOnline } from '@/features/print/use-back-online';
import type { usePrintChoices } from '@/features/print/use-print-choices';
import type { PrintPageProps } from '@/features/print/use-print-page';
import { usePrintQueue } from '@/features/print/use-print-queue';
import { usePrintRun } from '@/features/print/use-print-run';
import { usePrintThrottle } from '@/features/print/use-print-throttle';
import { useOnline } from '@/hooks/use-online';
import type { PrintSelection } from '@/lib/render/edition-types';
import type { SetChoice } from '@/lib/render/print-api';
import { skippedOf } from '@/lib/render/print-selection';
import type { Locale } from '@/types/game';
import type {
    PrintJobStatusData,
    PrintPart,
    PrintPartStatusData,
    PrintSet,
} from '@/types/generated';

type RequestInput = Pick<PrintPageProps, 'job' | 'editionData'> & {
    services: PrintServices;
    locale: Locale;
    status: PrintJobStatusData;
    setStatus: (status: PrintJobStatusData) => void;
    choiceToSend: (forSet: PrintSet) => SetChoice;
    savingChoices: ReturnType<typeof usePrintChoices>['savingChoices'];
};

/** The choices of a set as they travel to the server. */
export const choiceToSendOf = (
    selection: PrintSelection,
    choice: Choice,
): SetChoice => ({
    // What goes in the set is one choice for the edition (B198), the same for both sets.
    skipped: skippedOf(selection),
    moneyAmount: choice.moneyAmount,
    copies: choice.copies,
    boardForm: choice.boardForm,
    invitations: choice.invitations,
});

export const usePrintRequests = (input: RequestInput) => {
    const { job, status, setStatus } = input;
    const throttle = usePrintThrottle();
    const online = useOnline();
    const retryRef = useRef<(forSet: PrintSet, chosen: PrintPart[]) => void>(
        () => undefined,
    );
    const run = usePrintRun({ ...input, retryRef, hold: throttle.hold });
    useBackOnline(online, run.lost, job, setStatus);
    const [remakeQueued, setRemakeQueued] = useState(false);
    // A part asked for while a run is going waits in this browser and starts right after it.
    const queue = usePrintQueue(
        (job !== null || remakeQueued) &&
            !run.working &&
            !status.busy &&
            !throttle.throttled,
        run.make,
    );
    const rowFor = (
        part: PrintPart,
        forSet: PrintSet,
    ): PrintPartStatusData | undefined =>
        partStatusRow(status.parts, run.sending, part, forSet);
    const isActive = (part: PrintPart, forSet: PrintSet): boolean => {
        const shown = rowFor(part, forSet)?.status;

        return shown === 'waiting' || shown === 'running';
    };
    const wantedOf = (forSet: PrintSet, chosen: PrintPart[]): PrintPart[] =>
        chosen.filter(
            (part) => !isActive(part, forSet) && !queue.isQueued(forSet, part),
        );
    const request = (forSet: PrintSet, chosen: PrintPart[]): void => {
        const wanted = wantedOf(forSet, chosen);

        if (wanted.length === 0) {
            return;
        }
        run.setError(null);
        if (job === null) {
            void run.make(forSet, wanted);

            return;
        }
        queue.enqueue(forSet, wanted);
    };
    useEffect(() => {
        retryRef.current = request;
    });

    return {
        ...run,
        ...queue,
        throttle,
        online,
        rowFor,
        isActive,
        request,
        wantedOf,
        remakeQueued,
        setRemakeQueued,
    };
};
