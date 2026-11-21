import type { ReactNode } from 'react';

import { ChevronDownIcon } from '@/components/icons';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';

/** The most sets the page lets you count with; the same as PrintJob::MAX_COPIES. */
const MAX_COPIES = 40;

export interface BarProblem {
    message: string;
    /** Seconds until the page tries again by itself; null when it does not. */
    seconds: number | null;
    onRetryNow?: () => void;
}

/**
 * The fixed bar at the bottom of the print page (B149): the server line or, when something went wrong, the
 * message right next to the button (bug 4 of test round 3); what the chosen parts take together (UX 3); the
 * number of sets; and the buttons.
 */
export function PrintBar({
    notice,
    problem,
    estimate,
    progress,
    copies,
    onCopies,
    children,
}: {
    notice: string;
    problem: BarProblem | null;
    estimate: string;
    progress: string;
    copies: number;
    onCopies: (copies: number) => void;
    children: ReactNode;
}) {
    const t = useTranslation();
    const tc = useTranslationChoice();

    return (
        <div className="sticky bottom-0 z-20 max-w-full border-t-2 border-ink bg-card">
            {/* On a phone on its side the bar is one thin line with the buttons, so it leaves the list in sight (bug 2). */}
            <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-2 md:flex-row md:items-center md:gap-6 md:px-8 md:py-3 low:flex-row low:items-center low:gap-3 low:py-1.5">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {problem === null ? (
                        <>
                            <p className="m-0 hidden text-sm text-ink-soft md:block low:hidden">
                                {notice}
                            </p>
                            {/* Phone and a low screen: one folded line, so the bar stays small (ronde 3). */}
                            <details
                                data-notice
                                className="group text-xs text-ink-soft md:hidden low:block"
                            >
                                <summary className="flex min-h-6 cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
                                    <span className="min-w-0 flex-1 truncate group-open:hidden">
                                        {notice}
                                    </span>
                                    <span className="hidden flex-1 font-semibold group-open:inline">
                                        {t('print.notice_fold')}
                                    </span>
                                    <ChevronDownIcon
                                        size={14}
                                        aria-hidden="true"
                                        className="flex-none rotate-180 group-open:rotate-0"
                                    />
                                </summary>
                                <p className="m-0 pt-1">{notice}</p>
                            </details>
                        </>
                    ) : (
                        <p
                            role="alert"
                            className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border-2 border-ink bg-warning px-3 py-1.5 text-sm font-semibold"
                        >
                            <span>{problem.message}</span>
                            {problem.onRetryNow !== undefined && (
                                <button
                                    type="button"
                                    onClick={problem.onRetryNow}
                                    className="-my-1.5 inline-flex min-h-11 cursor-pointer items-center font-extrabold underline underline-offset-4 hover:text-press"
                                >
                                    {t('print.retry_now')}
                                </button>
                            )}
                        </p>
                    )}
                    <p
                        aria-live="polite"
                        data-estimate=""
                        className="m-0 font-mono text-xs text-ink md:text-sm low:truncate"
                    >
                        {estimate}
                        <span className="text-ink-soft low:hidden">
                            {' '}
                            · {progress}
                        </span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:gap-3 low:flex-nowrap">
                    <div
                        role="group"
                        aria-label={t('print.copies.aria')}
                        className="flex flex-none items-center rounded-control border-2 border-ink bg-card"
                    >
                        <button
                            type="button"
                            aria-label={t('print.copies.less')}
                            disabled={copies <= 1}
                            onClick={() => {
                                onCopies(Math.max(1, copies - 1));
                            }}
                            className="size-11 cursor-pointer text-xl leading-none font-extrabold hover:bg-paper disabled:cursor-default disabled:text-ink-soft disabled:hover:bg-card"
                        >
                            −
                        </button>
                        <span
                            aria-live="polite"
                            className="min-w-16 text-center text-sm font-semibold whitespace-nowrap"
                        >
                            {tc('print.copies.value', copies)}
                        </span>
                        <button
                            type="button"
                            aria-label={t('print.copies.more')}
                            disabled={copies >= MAX_COPIES}
                            onClick={() => {
                                onCopies(Math.min(MAX_COPIES, copies + 1));
                            }}
                            className="size-11 cursor-pointer text-xl leading-none font-extrabold hover:bg-paper disabled:cursor-default disabled:text-ink-soft disabled:hover:bg-card"
                        >
                            +
                        </button>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
