import type { ReactNode } from 'react';

import {
    useTranslation,
    useTranslationChoice,
} from '@/hooks/use-translation';

/** The most sets the page lets you count with; the same as PrintJob::MAX_COPIES. */
export const MAX_COPIES = 40;

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
        <div className="sticky bottom-0 z-20 border-t-2 border-ink bg-card">
            <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-8">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {problem === null ? (
                        <p className="m-0 text-xs text-ink-soft md:text-sm">
                            {notice}
                        </p>
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
                        className="m-0 font-mono text-sm text-ink"
                    >
                        {estimate}
                        <span className="text-ink-soft"> · {progress}</span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:gap-3">
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
