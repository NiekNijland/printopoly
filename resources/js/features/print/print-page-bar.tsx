import { useEffect } from 'react';
import {
    describeEstimate,
    partQuantity,
    setEstimate,
} from '@/features/print/estimate';
import { PrintBar } from '@/features/print/print-bar';
import { barActivity, barProblem } from '@/features/print/print-bar-state';
import { PrintSetActions } from '@/features/print/print-set-actions';
import { REVIEW_ID } from '@/features/print/review-list';
import { usePageText } from '@/features/print/set-part-row';
import type { ShareFile } from '@/features/print/share-set-button';
import { useCanShareFiles } from '@/features/print/use-can-share-files';
import type { PrintPage } from '@/features/print/use-print-page';
import { listIssues } from '@/lib/render/checks-summary';
import type { CheckIssue } from '@/lib/render/checks-types';
import { banknoteTotal } from '@/lib/render/print-money';
import { markPrinted } from '@/lib/render/print-printed';
import type { PrintPart, PrintPartStatusData } from '@/types/generated';

type Text = ReturnType<typeof usePageText>;

// How much the set takes, before anything is made (UX 3 of test round 3).
const estimateOf = (page: PrintPage, { t, tc }: Text): string => {
    const { selected, set, choice } = page;

    return describeEstimate(
        setEstimate(
            selected.map((part) => ({
                part,
                quantity: partQuantity(part, set, page.counted),
            })),
            choice.copies,
        ),
        choice.copies,
        t,
        tc,
        selected.includes('money')
            ? banknoteTotal(page.moneyAmount) * choice.copies
            : 0,
    );
};

const PageSetActions = ({
    page,
    allDone,
    setLeft,
}: {
    page: PrintPage;
    allDone: boolean;
    setLeft: PrintPart[];
}) => {
    const { t } = usePageText();
    const shareFiles = useCanShareFiles();
    const { set, selected, requests: r, status, job } = page;
    const name = page.edition.name === '' ? page.drawn.name : page.edition.name;

    return (
        <PrintSetActions
            set={set}
            allDone={allDone}
            blocked={
                (job === null && (r.working || page.reusing)) ||
                r.throttle.throttled
            }
            busy={
                r.working ||
                status.busy ||
                r.throttle.throttled ||
                r.queue.some((entry) => entry.set === set)
            }
            left={setLeft.length}
            onMake={() => {
                r.request(set, setLeft);
            }}
            zipReady={
                set === 'printer' ? status.printerZipReady : status.homeZipReady
            }
            zipUrl={
                set === 'printer' ? status.printerZipUrl : status.homeZipUrl
            }
            shareFiles={shareFiles}
            files={() => shareFilesOf(selected, (part) => r.rowFor(part, set))}
            title={name === '' ? t('print.title') : name}
        />
    );
};

export const PrintPageBar = ({
    page,
    anyMade,
    issues,
}: {
    page: PrintPage;
    anyMade: boolean;
    issues: CheckIssue[] | null;
}) => {
    const { set, choice, selected, requests: r, job } = page;
    const text = usePageText();
    const { t } = text;
    const days = job?.retentionDays ?? 7;
    const doneCount = selected.filter(
        (part) => r.rowFor(part, set)?.status === 'done',
    ).length;
    const allDone = selected.length > 0 && doneCount === selected.length;
    // What the set button would still add: the chosen parts that are not made, going or in line already.
    const setLeft = selected.filter(
        (part) =>
            !r.isActive(part, set) &&
            !r.isQueued(set, part) &&
            r.rowFor(part, set)?.status !== 'done',
    );
    // Mijn edities and "Verder met" say which editions were printed, also after the files are gone (R6 Kees, B260).
    usePrintedMark(
        allDone && (page.editionData !== null || page.local !== null)
            ? page.drawn.id
            : null,
        page.drawn.revision,
    );
    const problem = barProblem(
        {
            online: r.online,
            lost: r.lost,
            uploading: r.uploading,
            throttle: r.throttle.throttled ? r.throttle : null,
            error: r.error,
        },
        t,
    );

    return (
        <PrintBar
            notice={
                anyMade
                    ? job?.anonymous === true
                        ? t('print.close_note_anonymous', { days })
                        : t('print.close_note', { days })
                    : t('print.server_notice', { days })
            }
            problem={problem}
            activity={barActivity(r.working, r.uploading, page.locale, t)}
            estimate={estimateOf(page, text)}
            progress={t('print.progress', {
                done: doneCount,
                total: selected.length,
            })}
            copies={choice.copies}
            onCopies={(copies) => {
                page.choose(set, { copies });
            }}
            check={
                issues === null
                    ? null
                    : {
                          count: listIssues(issues).length,
                          href: `#${REVIEW_ID}`,
                      }
            }
        >
            <PageSetActions page={page} allDone={allDone} setLeft={setLeft} />
        </PrintBar>
    );
};

const shareFilesOf = (
    selected: PrintPart[],
    rowFor: (part: PrintPart) => PrintPartStatusData | undefined,
): ShareFile[] =>
    selected.flatMap((part) => {
        const row = rowFor(part);
        const url = row?.downloadUrl;
        // The invitation also goes as its picture: that is what goes in a group app (R6 Sara).
        const image = row?.imageUrl;

        return [
            ...(url == null ? [] : [{ url, name: `${part}.pdf` }]),
            ...(image == null
                ? []
                : [{ url: image, name: `${part}.png`, type: 'image/png' }]),
        ];
    });

const usePrintedMark = (
    printedId: string | null,
    printedRevision: number,
): void => {
    useEffect(() => {
        if (printedId !== null) {
            markPrinted(printedId, {
                at: Date.now(),
                revision: printedRevision,
            });
        }
    }, [printedId, printedRevision]);
};
