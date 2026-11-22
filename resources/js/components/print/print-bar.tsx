import type { ReactNode } from 'react';

import { ChevronDownIcon, WarningIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';

/** The most sets the page lets you count with; the same as PrintJob::MAX_COPIES. */
const MAX_COPIES = 40;

export interface BarProblem {
    message: string;
    /** Seconds until the page tries again by itself; null when it does not. */
    seconds: number | null;
    onRetryNow?: () => void;
}

/** What the page is doing right now, such as sending photos (bug 11 of test round 4). */
export interface BarActivity {
    message: string;
    /** How far along, 0 to 1; null when the page cannot tell. */
    fraction: number | null;
}

/** Open messages of the Controle (UX 7, B179, B197): a jump to Nog even nakijken at the top of the page. */
export interface BarCheck {
    count: number;
    href: string;
}

/**
 * The fixed bar at the bottom of the print page (B149): the server line or, when something went wrong, the
 * message right next to the button (bug 4 of test round 3); what the chosen parts take together (UX 3); open
 * Controle messages, which never stop printing (B179); the number of sets; and the buttons. On a phone and a low
 * screen the estimate is one line that folds open to the server line, and the buttons share one row, so the bar
 * stays below a fifth of a small screen (B179).
 */
export function PrintBar({
    notice,
    problem,
    activity = null,
    estimate,
    progress,
    copies,
    onCopies,
    check = null,
    children,
}: {
    notice: string;
    problem: BarProblem | null;
    activity?: BarActivity | null;
    estimate: string;
    progress: string;
    copies: number;
    onCopies: (copies: number) => void;
    check?: BarCheck | null;
    children: ReactNode;
}) {
    const t = useTranslation();
    const tc = useTranslationChoice();

    const checkLink =
        check === null || check.count === 0 ? null : (
            <a
                href={check.href}
                data-check-note=""
                aria-label={tc('print.check_note_aria', check.count)}
                // Phone: a 44 px target beside the estimate. Wider: inline after the estimate, so the bar stays low.
                className="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-control px-1 text-xs font-semibold text-ink underline decoration-press decoration-2 underline-offset-4 hover:text-press md:ml-2 md:inline md:min-h-0 md:px-0 md:font-sans md:text-sm low:ml-0 low:inline-flex low:min-h-11 low:px-1 low:text-xs"
            >
                <WarningIcon
                    size={16}
                    aria-hidden="true"
                    className="flex-none text-press md:mr-1 md:inline md:align-[-3px] low:mr-0"
                />
                <span className="md:hidden low:inline">
                    {tc('print.check_note_short', check.count)}
                </span>
                <span className="hidden md:inline low:hidden">
                    {tc('print.check_note', check.count)}
                </span>
            </a>
        );

    return (
        <div className="sticky bottom-0 z-20 max-w-full border-t-2 border-ink bg-card">
            {/* On a phone on its side the bar is one thin line with the buttons, so it leaves the list in sight (bug 2). */}
            <div className="mx-auto flex max-w-content flex-col gap-1 px-4 pt-1 pb-2 md:gap-2 md:px-8 md:py-3 xl:flex-row xl:items-center xl:gap-6 low:flex-row low:items-center low:gap-3 low:py-1">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {problem === null && activity !== null ? (
                        // Right next to the button and on every screen, never far down the page (bug 11).
                        <div
                            role="status"
                            data-activity=""
                            className="flex min-w-0 flex-col gap-1 pt-1 text-sm font-semibold"
                        >
                            <span className="min-w-0">{activity.message}</span>
                            <span
                                aria-hidden="true"
                                className="block h-1.5 overflow-hidden rounded-full border border-ink bg-paper"
                            >
                                <span
                                    className={
                                        activity.fraction === null
                                            ? 'block h-full w-1/3 animate-pulse bg-press'
                                            : 'block h-full bg-press transition-[width]'
                                    }
                                    style={
                                        activity.fraction === null
                                            ? undefined
                                            : {
                                                  width: `${String(Math.round(Math.min(1, Math.max(0, activity.fraction)) * 100))}%`,
                                              }
                                    }
                                />
                            </span>
                        </div>
                    ) : problem === null ? (
                        <p className="m-0 hidden text-sm text-ink-soft md:block low:hidden">
                            {notice}
                        </p>
                    ) : (
                        <p
                            role="alert"
                            className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border-2 border-ink bg-warning px-3 py-1.5 text-sm font-semibold"
                        >
                            <span>{problem.message}</span>
                            {problem.onRetryNow !== undefined && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={problem.onRetryNow}
                                    className="-my-1.5 min-h-11 px-1 font-extrabold underline underline-offset-4 hover:bg-transparent hover:text-press"
                                >
                                    {t('print.retry_now')}
                                </Button>
                            )}
                        </p>
                    )}
                    <div className="flex min-w-0 items-center gap-2 md:block low:flex">
                        {/* Phone and a low screen: the estimate is one line, and folds open to the rest (ronde 3, B179). */}
                        <Collapsible
                            data-notice=""
                            className="group min-w-0 flex-1 text-xs md:hidden low:block"
                        >
                            <CollapsibleTrigger className="flex min-h-11 w-full cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-left text-xs text-ink">
                                <span
                                    aria-live="polite"
                                    className="min-w-0 flex-1 truncate font-mono text-ink group-data-[state=open]:hidden"
                                >
                                    {estimate}
                                </span>
                                <span className="hidden flex-1 font-semibold group-data-[state=open]:inline">
                                    {t('print.notice_fold')}
                                </span>
                                <ChevronDownIcon
                                    size={14}
                                    aria-hidden="true"
                                    className="flex-none rotate-180 group-data-[state=open]:rotate-0"
                                />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="flex flex-col gap-1 pb-1 text-ink-soft">
                                <p className="m-0 font-mono text-ink">
                                    {estimate} · {progress}
                                </p>
                                {problem === null && (
                                    <p className="m-0">{notice}</p>
                                )}
                            </CollapsibleContent>
                        </Collapsible>
                        <p
                            aria-live="polite"
                            data-estimate=""
                            className="m-0 hidden font-mono text-sm text-ink md:inline low:hidden"
                        >
                            {estimate}
                            <span className="text-ink-soft"> · {progress}</span>
                        </p>
                        {checkLink}
                    </div>
                </div>
                <div className="flex items-center gap-2 md:justify-end md:gap-3">
                    <div
                        role="group"
                        aria-label={t('print.copies.aria')}
                        className="flex flex-none items-center rounded-control border-2 border-ink bg-card"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('print.copies.less')}
                            disabled={copies <= 1}
                            onClick={() => {
                                onCopies(Math.max(1, copies - 1));
                            }}
                            className="size-11 rounded-none text-xl font-extrabold hover:bg-paper"
                        >
                            −
                        </Button>
                        <span
                            aria-live="polite"
                            className="min-w-11 text-center text-sm font-semibold whitespace-nowrap md:min-w-16"
                        >
                            {tc('print.copies.value', copies)}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('print.copies.more')}
                            disabled={copies >= MAX_COPIES}
                            onClick={() => {
                                onCopies(Math.min(MAX_COPIES, copies + 1));
                            }}
                            className="size-11 rounded-none text-xl font-extrabold hover:bg-paper"
                        >
                            +
                        </Button>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
