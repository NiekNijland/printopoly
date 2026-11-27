import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { PrintPart, PrintPartStatusData } from '@/types/generated';

export type Shown = PrintPartStatusData['status'] | 'skipped' | 'queued';

/** A shape next to the words, so the status never rests on colour alone (B98). */
const GLYPH: Record<Shown, string> = {
    idle: '○',
    skipped: '–',
    waiting: '…',
    queued: '…',
    running: '◐',
    done: '✓',
    failed: '!',
    outdated: '…',
};

const statusLabel = (
    status: Shown,
    waitingFor: PrintPart | null,
    t: (key: string, replacements?: Record<string, string | number>) => string,
): string => {
    switch (status) {
        case 'waiting':
            return waitingFor === null
                ? t('print.status.waiting_generic')
                : t('print.status.waiting', {
                      part: t(`print.part.${waitingFor}`),
                  });
        case 'queued':
            return t('print.status.queued');
        case 'running':
            return t('print.status.running');
        case 'done':
            return t('print.status.done');
        case 'failed':
            return t('print.status.failed');
        case 'outdated':
            return t('print.status.outdated');
        case 'idle':
            return t('print.status.idle');
        case 'skipped':
            return t('print.status.skipped');
    }
};

export const PartStatusBadge = ({
    shown,
    waitingFor,
}: {
    shown: Shown;
    waitingFor: PrintPart | null;
}) => {
    const t = useTranslation();

    return (
        <span
            aria-live="polite"
            className={cn(
                'inline-flex items-center gap-2 border-2 border-ink px-2 py-0.5 text-xs font-extrabold tracking-wide uppercase',
                shown === 'done' && 'bg-print-green text-ink',
                shown === 'failed' && 'bg-press text-white',
                (shown === 'running' ||
                    shown === 'waiting' ||
                    shown === 'queued' ||
                    shown === 'outdated') &&
                    'bg-warning',
                (shown === 'idle' || shown === 'skipped') &&
                    'border-line-strong text-ink-soft',
            )}
        >
            <span aria-hidden="true">{GLYPH[shown]}</span>
            {statusLabel(shown, waitingFor, t)}
        </span>
    );
};
