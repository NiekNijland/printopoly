import { setInUrl } from '@/features/print/print-page-setup';
import type { useLocalPrintEdition } from '@/features/print/use-local-print-edition';
import type { usePrintRequests } from '@/features/print/use-print-requests';
import type { PrintJobData, PrintPart, PrintSet } from '@/types/generated';

type Requests = ReturnType<typeof usePrintRequests>;

type AutoInput = {
    job: PrintJobData | null;
    requests: Requests;
    loaded: ReturnType<typeof useLocalPrintEdition>;
    set: PrintSet;
    rememberedSet: PrintSet | undefined;
    selected: PrintPart[];
};

/**
 * A set made before the edition changed is made again at once: on the page of a job the parts that changed go
 * in line by themselves, and an edition this browser printed before starts its new set straight away. Until
 * they are done there is nothing to download (Niek, 22 nov). Both follow from what the page shows, so they are
 * put in line while it renders.
 */
export const useStartsByThemselves = (a: AutoInput): void => {
    const { requests: r, set, selected, loaded } = a;
    const outdated = selected.filter(
        (part) =>
            r.rowFor(part, set)?.status === 'outdated' &&
            !r.isQueued(set, part),
    );
    if (a.job !== null) {
        if (outdated.length > 0 && !r.throttle.throttled) {
            if (r.error !== null) {
                r.setError(null);
            }
            r.enqueue(set, r.wantedOf(set, outdated));
        }

        return;
    }
    const remakeDue =
        loaded.remake &&
        !r.remakeQueued &&
        !loaded.reusing &&
        loaded.local !== null &&
        !r.working &&
        selected.length > 0 &&
        !(
            a.rememberedSet !== undefined &&
            set !== a.rememberedSet &&
            !setInUrl()
        );
    if (remakeDue) {
        r.setRemakeQueued(true);
        if (r.error !== null) {
            r.setError(null);
        }
        r.enqueue(set, r.wantedOf(set, selected));
    }
};
