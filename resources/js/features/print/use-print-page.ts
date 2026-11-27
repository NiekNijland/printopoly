import { usePage } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import type { PrintServices } from '@/features/print/print-page-setup';
import { usePrintChoices } from '@/features/print/use-print-choices';
import { usePrintCounts } from '@/features/print/use-print-counts';
import { usePrintEditions } from '@/features/print/use-print-editions';
import { usePrintJob } from '@/features/print/use-print-job';
import {
    usePrintRequests,
    choiceToSendOf,
} from '@/features/print/use-print-requests';
import { usePrintSet } from '@/features/print/use-print-set';
import { useSelectionMemory } from '@/features/print/use-selection-memory';
import { useStartsByThemselves } from '@/features/print/use-starts-by-themselves';
import type { Edition, PrintSelection } from '@/lib/render/edition-types';
import type { PrintEdition } from '@/lib/render/print-composition';
import {
    skippedOf,
    toggleSelectionPart,
    type SetPart,
} from '@/lib/render/print-selection';
import type { PrintJobData, PrintPart, PrintSet } from '@/types/generated';

export type PrintPageProps = {
    /** Null on the page before a job exists: the edition lives in this browser. */
    job: PrintJobData | null;
    /** The id of the edition in this browser, on the page before a job exists. */
    localEditionId: string | null;
    edition: { name: string; cards: number; parts: PrintPart[] };
    /** The edition of the job, to draw the parts from. Null before a job exists: it lives in this browser. */
    editionData: PrintEdition | null;
};

type SelectionOf = (
    chosen: PrintSelection | null,
    checked: Edition | null,
    job: PrintJobData | null,
    drawn: Edition,
    set: PrintSet,
    serverParts: PrintPart[],
) => PrintSelection;

export const usePrintPage = (
    props: PrintPageProps,
    services: PrintServices,
    selectionOf: SelectionOf,
) => {
    const { job, edition, localEditionId } = props;
    const { locale } = usePage().props;
    const { status, setStatus } = usePrintJob(job);
    const editions = usePrintEditions(props, services, locale);
    const { drawn, checked } = editions;
    const { set, pick, rememberedSet } = usePrintSet(localEditionId, checked);
    const { choices, choose, savingChoices } = usePrintChoices(job, setStatus);
    const memory = useSelectionMemory(job, checked, services, editions.saved);
    const selection = useMemo(
        () =>
            selectionOf(memory.chosen, checked, job, drawn, set, edition.parts),
        [selectionOf, memory.chosen, checked, job, drawn, set, edition.parts],
    );
    const choiceToSend = useCallback(
        (forSet: PrintSet) => choiceToSendOf(selection, choices[forSet]),
        [choices, selection],
    );
    const requests = usePrintRequests({
        ...props,
        services,
        locale,
        status,
        setStatus,
        choiceToSend,
        savingChoices,
    });
    const choice = choices[set];
    const counts = usePrintCounts({
        ...props,
        ...editions,
        selection,
        set,
        choice,
    });
    useStartsByThemselves({
        job,
        requests,
        loaded: editions,
        set,
        rememberedSet,
        selected: counts.selected,
    });

    /** Ticks a part in or out of the set: for both sets on the job, and on the edition. The board stays in. */
    const togglePart = (part: SetPart): void => {
        const next = { ...toggleSelectionPart(selection, part), set };
        const skippedNow = skippedOf(next);

        choose('printer', { skipped: skippedNow });
        choose('home', { skipped: skippedNow });
        memory.keep(next);
    };
    const switchSet = (next: PrintSet): void => {
        pick(next);
        memory.keep({ ...selection, set: next });
    };

    return {
        ...props,
        ...editions,
        ...counts,
        locale,
        status,
        set,
        choice,
        choose,
        selection,
        requests,
        rememberFailed: memory.rememberFailed,
        togglePart,
        switchSet,
    };
};

export type PrintPage = ReturnType<typeof usePrintPage>;
