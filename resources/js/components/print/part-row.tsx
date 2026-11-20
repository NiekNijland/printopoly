import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type {
    PrintPart,
    PrintPartStatusData,
    PrintSet,
} from '@/types/generated';

const THUMB: Record<PrintPart, string> = {
    board: 'bg-board',
    cards: 'bg-print-chance',
    money: 'bg-print-chest',
    tokens: 'bg-card',
    box_lid: 'bg-board',
    calibration: 'bg-white',
};

interface PartRowProps {
    set: PrintSet;
    part: PrintPart;
    /** The row from the server; undefined before the first run. */
    row: PrintPartStatusData | undefined;
    /** Only parts that can be left out have a checkbox (B99). */
    included: boolean | null;
    onToggle: () => void;
    onMake: () => void;
    /** A run is busy or a request is on its way: nothing new starts. */
    disabled: boolean;
    cards: number;
}

/**
 * One row of the print page (B95): name, what to order, the spec in mono, the status as text and the
 * buttons that fit the status. Colour never carries the status alone (B98).
 */
export function PartRow({
    set,
    part,
    row,
    included,
    onToggle,
    onMake,
    disabled,
    cards,
}: PartRowProps) {
    const t = useTranslation();
    const status = row?.status ?? 'idle';
    const name = t(`print.part.${part}`);
    const order =
        part === 'calibration'
            ? t('print.order.calibration')
            : t(`print.order.${set}.${part}`);
    const spec =
        part === 'calibration'
            ? t('print.spec.calibration')
            : t(`print.spec.${set}.${part}`, {
                  cards,
                  sheets: Math.ceil(cards / 4),
              });

    return (
        <li className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line py-4">
            {included === null ? (
                <span
                    className="hidden w-5 flex-none md:block"
                    aria-hidden="true"
                />
            ) : (
                <input
                    type="checkbox"
                    checked={included}
                    onChange={onToggle}
                    aria-label={t('print.include', { part: name })}
                    className="size-5 flex-none accent-press"
                />
            )}
            <span
                aria-hidden="true"
                className={cn(
                    'hidden h-17 w-12 flex-none border border-line-strong md:block',
                    THUMB[part],
                )}
            />
            <span className="flex min-w-0 flex-[1_1_16rem] flex-col">
                <strong>{name}</strong>
                <span className="text-sm">{order}</span>
                <span className="font-mono text-xs text-ink-soft">{spec}</span>
            </span>
            <span
                aria-live="polite"
                className={cn(
                    'text-sm font-semibold',
                    status === 'failed' && 'text-press',
                    status === 'idle' && 'hidden',
                )}
            >
                {statusLabel(status, row?.waitingFor ?? null, t)}
            </span>
            <span className="flex flex-wrap gap-3">
                {(status === 'idle' ||
                    status === 'outdated' ||
                    status === 'failed') && (
                    <Button
                        variant="secondary"
                        onClick={onMake}
                        disabled={disabled}
                        aria-label={`${actionLabel(status, t)}: ${name}`}
                    >
                        {actionLabel(status, t)}
                    </Button>
                )}
                {status === 'done' && row?.downloadUrl != null && (
                    <Button variant="secondary" asChild>
                        <a
                            href={row.downloadUrl}
                            aria-label={t('print.pdf_of', { part: name })}
                        >
                            {t('print.pdf')}
                        </a>
                    </Button>
                )}
                {status === 'done' && row?.instructionsUrl != null && (
                    <Button variant="ghost" asChild>
                        <a
                            href={row.instructionsUrl}
                            aria-label={t('print.instructions_of', {
                                part: name,
                            })}
                        >
                            {t('print.instructions')}
                        </a>
                    </Button>
                )}
            </span>
        </li>
    );
}

function actionLabel(
    status: 'idle' | 'outdated' | 'failed',
    t: (key: string) => string,
): string {
    if (status === 'failed') {
        return t('print.retry');
    }

    return status === 'outdated' ? t('print.remake') : t('print.make_part');
}

function statusLabel(
    status: PrintPartStatusData['status'],
    waitingFor: PrintPart | null,
    t: (key: string, replacements?: Record<string, string | number>) => string,
): string {
    switch (status) {
        case 'waiting':
            return waitingFor === null
                ? t('print.status.waiting_generic')
                : t('print.status.waiting', {
                      part: t(`print.part.${waitingFor}`),
                  });
        case 'running':
            return t('print.status.running');
        case 'done':
            return t('print.status.done');
        case 'failed':
            return t('print.status.failed');
        case 'outdated':
            return t('print.status.outdated');
        case 'idle':
            return '';
    }
}
