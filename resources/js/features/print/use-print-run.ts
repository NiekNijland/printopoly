import { useCallback, useState, type RefObject } from 'react';

import type { Sending } from '@/features/print/part-status-row';
import type { PrintServices } from '@/features/print/print-page-setup';
import {
    runFailureOf,
    type RunFailure,
} from '@/features/print/print-run-failure';
import { uploadFirstJob } from '@/features/print/upload-first-job';
import type { StartOutcome } from '@/features/print/use-print-queue';
import { useTranslation } from '@/hooks/use-translation';
import { startRun, type SetChoice } from '@/lib/render/print-api';
import type { PrintEdition } from '@/lib/render/print-composition';
import { toEdition } from '@/lib/render/print-edition';
import { photoTargets } from '@/lib/render/print-photo-targets';
import type { UploadProgress } from '@/lib/render/print-upload-progress';
import type { Locale } from '@/types/game';
import type {
    PrintJobData,
    PrintJobStatusData,
    PrintPart,
    PrintSet,
} from '@/types/generated';

type Request = (forSet: PrintSet, chosen: PrintPart[]) => void;

type Lost = { retry: () => void };

type RunInput = {
    job: PrintJobData | null;
    editionData: PrintEdition | null;
    services: PrintServices;
    locale: Locale;
    setStatus: (status: PrintJobStatusData) => void;
    choiceToSend: (forSet: PrintSet) => SetChoice;
    savingChoices: RefObject<Promise<unknown>>;
    /** The latest `request`, for a throttled request that tries again later with the queue as it is then. */
    retryRef: RefObject<Request>;
    hold: (seconds: number, retry: () => void) => void;
};

const runOnJob = async (
    job: PrintJobData,
    editionData: PrintEdition | null,
    forSet: PrintSet,
    chosen: PrintPart[],
    choice: SetChoice,
    locale: Locale,
): Promise<PrintJobStatusData> => {
    // The frame of every photo comes from the renderers, so the browser says how large it is (B61).
    const targets =
        editionData === null ? undefined : photoTargets(toEdition(editionData));

    return startRun(job.generateUrl, forSet, chosen, targets, choice, locale);
};

type FailureHandlers = {
    setLost: (lost: Lost | null) => void;
    hold: (seconds: number, retry: () => void) => void;
    setError: (message: string) => void;
};

const showFailure = (
    failure: RunFailure,
    retry: () => void,
    on: FailureHandlers,
): void => {
    if (failure.kind === 'lost') {
        on.setLost({
            retry: () => {
                on.setLost(null);
                retry();
            },
        });
    } else if (failure.kind === 'throttled') {
        on.hold(failure.seconds, retry);
    } else if (failure.kind === 'error') {
        on.setError(failure.message);
    }
};

export const usePrintRun = (input: RunInput) => {
    const t = useTranslation();
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState<Sending>(null);
    /** Photos and bytes sent so far while the edition is uploaded for a new job; null when nothing is uploading. */
    const [uploading, setUploading] = useState<UploadProgress | null>(null);
    /** A request that failed because the connection was gone: it goes again once the browser is online (bug 12). */
    const [lost, setLost] = useState<Lost | null>(null);
    const { job, editionData, services, locale, setStatus } = input;
    const { choiceToSend, savingChoices, retryRef, hold } = input;

    const make = useCallback(
        async (
            forSet: PrintSet,
            chosen: PrintPart[],
        ): Promise<StartOutcome> => {
            setWorking(true);
            setSending({ set: forSet, parts: chosen });
            setError(null);

            try {
                if (job === null) {
                    const made = await uploadFirstJob({
                        services,
                        locale,
                        forSet,
                        chosen,
                        choice: choiceToSend(forSet),
                        onProgress: setUploading,
                    });
                    if (!made) {
                        setError(t('print.no_edition'));
                    }

                    return made ? 'started' : 'failed';
                }
                // A choice still on its way lands before the run, never during it.
                await savingChoices.current;
                setStatus(
                    await runOnJob(
                        job,
                        editionData,
                        forSet,
                        chosen,
                        choiceToSend(forSet),
                        locale,
                    ),
                );

                return 'started';
            } catch (caught) {
                const failure = runFailureOf(caught, job !== null);
                showFailure(
                    failure,
                    () => {
                        retryRef.current(forSet, chosen);
                    },
                    { setLost, hold, setError: (key) => setError(t(key)) },
                );

                return failure.kind === 'busy' ? 'busy' : 'failed';
            } finally {
                setWorking(false);
                setSending(null);
                setUploading(null);
            }
        },
        [
            choiceToSend,
            editionData,
            job,
            locale,
            services,
            setStatus,
            t,
            savingChoices,
            retryRef,
            hold,
        ],
    );

    return { make, working, sending, uploading, error, setError, lost };
};
