import type { EditionStatus } from '@/features/edition/use-edition-status';
import { useTranslation } from '@/hooks/use-translation';
import type { PrintedState } from '@/lib/render/print-printed';
import { cn } from '@/lib/utils';

export type StatusLine = {
    text: string;
    tone: 'new' | 'ready' | 'printed' | 'plain';
};

type Words = {
    t: (key: string, replacements?: Record<string, string | number>) => string;
    tc: (key: string, count: number) => string;
    date: (at: number) => string;
};

export const statusLines = (
    status: EditionStatus,
    printed: PrintedState | undefined,
    { t, tc, date }: Words,
): StatusLine[] => {
    const lines: StatusLine[] = [];
    if (status.contributions > 0) {
        lines.push({
            text: tc('editions.status_contributions', status.contributions),
            tone: 'new',
        });
    } else if (status.boxUntil !== null) {
        lines.push({
            text: t('editions.status_box_open', {
                date: date(status.boxUntil),
            }),
            tone: 'plain',
        });
    }
    for (const [set, state] of [
        ['printer', status.printer],
        ['home', status.home],
    ] as const) {
        if (state.readyUntil !== null) {
            lines.push({
                text: t(`editions.status_${set}_ready`, {
                    date: date(state.readyUntil),
                }),
                tone: 'ready',
            });
        }
    }
    // Printed or not, once the files of the 7 days are gone, were never made or belong to an older version: a set
    // made before a change is not mentioned, the print page makes it again (Niek, 22 nov).
    if (
        printed !== undefined &&
        status.printer.readyUntil === null &&
        status.home.readyUntil === null
    ) {
        lines.push(
            printed.kind === 'never'
                ? { text: t('editions.status_not_printed'), tone: 'plain' }
                : {
                      text: t(
                          printed.kind === 'printed'
                              ? 'editions.status_printed'
                              : 'editions.status_printed_changed',
                          { date: date(printed.at) },
                      ),
                      tone: printed.kind === 'printed' ? 'printed' : 'plain',
                  },
        );
    }

    return lines;
};

export const StatusLines = ({ lines }: { lines: StatusLine[] }) => {
    const t = useTranslation();

    return (
        // Status lines, not buttons: a mark and a line of text each, as on the print page (B98).
        <ul
            aria-label={t('editions.status_label')}
            className="m-0 flex list-none flex-col gap-1 px-4 pb-3"
        >
            {lines.map((line) => (
                <li
                    key={line.text}
                    className={cn(
                        'flex items-baseline gap-2 text-sm',
                        line.tone === 'new' && 'font-semibold text-press',
                        line.tone === 'plain' && 'text-ink-soft',
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            'inline-flex size-4 flex-none translate-y-0.5 items-center justify-center rounded-full border-2 text-[9px] leading-none font-extrabold',
                            line.tone === 'new' &&
                                'border-press bg-press text-white',
                            line.tone === 'ready' &&
                                'border-ink bg-print-green text-ink',
                            line.tone === 'printed' &&
                                'border-ink bg-card text-ink',
                            line.tone === 'plain' &&
                                'border-line-strong bg-card',
                        )}
                    >
                        {line.tone === 'ready' || line.tone === 'printed'
                            ? '✓'
                            : line.tone === 'new'
                              ? '!'
                              : ''}
                    </span>
                    <span className="min-w-0">{line.text}</span>
                </li>
            ))}
        </ul>
    );
};
