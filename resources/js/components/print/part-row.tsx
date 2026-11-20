import { PartThumb } from '@/components/print/part-thumb';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition } from '@/lib/edition/types';
import type { PhotoInfos } from '@/lib/editor/photo-cache';
import { cn } from '@/lib/utils';
import type {
    PrintPart,
    PrintPartStatusData,
    PrintSet,
} from '@/types/generated';

/** The colour band of a part: the colours of the print inks, one per part (B104). */
const BAND: Record<PrintPart, string> = {
    board: 'bg-print-green',
    cards: 'bg-print-cyan',
    money: 'bg-print-yellow',
    tokens: 'bg-print-pink',
    box_lid: 'bg-print-orange',
    rules_booklet: 'bg-print-cyan',
    fold_models: 'bg-print-green',
    dice: 'bg-print-pink',
    invitation: 'bg-print-yellow',
    calibration: 'bg-ink',
};

const TILE: Record<PrintPart, string> = {
    board: 'bg-board',
    cards: 'bg-print-chance',
    money: 'bg-print-chest',
    tokens: 'bg-card',
    box_lid: 'bg-board-deep',
    rules_booklet: 'bg-card',
    fold_models: 'bg-card',
    dice: 'bg-card',
    invitation: 'bg-card',
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
    /** The edition to draw the part from. */
    edition: Edition;
    /** The photos of this browser, for the thumbnail. */
    photos?: PhotoInfos;
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
    edition,
    photos,
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

    const skipped = included === false;
    const shown = skipped ? 'skipped' : status;
    const canShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function';

    return (
        <li
            className={cn(
                'relative flex flex-wrap items-center gap-x-5 gap-y-3 border-2 border-ink bg-card py-4 pr-4 pl-6 shadow-print',
                skipped && 'bg-paper shadow-none',
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'absolute inset-y-0 left-0 w-2 border-r-2 border-ink',
                    BAND[part],
                    skipped && 'opacity-40',
                )}
            />
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
                className={cn(
                    'flex size-20 flex-none items-center justify-center border border-line-strong md:size-28',
                    TILE[part],
                    skipped && 'opacity-40 grayscale',
                )}
            >
                <span className="hidden md:block">
                    <PartThumb
                        part={part}
                        edition={edition}
                        size={112}
                        photos={photos}
                    />
                </span>
                <span className="md:hidden">
                    <PartThumb
                        part={part}
                        edition={edition}
                        size={80}
                        photos={photos}
                    />
                </span>
            </span>
            <span className="flex min-w-0 flex-[1_1_14rem] flex-col gap-0.5">
                <strong className="font-display text-xl leading-tight font-extrabold">
                    {name}
                </strong>
                <span className="text-sm">{order}</span>
                <span className="font-mono text-xs text-ink-soft">{spec}</span>
            </span>
            <span
                aria-live="polite"
                className={cn(
                    'inline-flex items-center gap-2 border-2 border-ink px-2 py-0.5 text-xs font-extrabold tracking-wide uppercase',
                    shown === 'done' && 'bg-print-green text-ink',
                    shown === 'failed' && 'bg-press text-white',
                    (shown === 'running' || shown === 'waiting') &&
                        'bg-warning',
                    shown === 'outdated' && 'bg-print-orange',
                    (shown === 'idle' || shown === 'skipped') &&
                        'border-line-strong text-ink-soft',
                )}
            >
                <span aria-hidden="true">{GLYPH[shown]}</span>
                {statusLabel(shown, row?.waitingFor ?? null, t)}
            </span>
            <span className="flex flex-wrap gap-3">
                {!skipped &&
                    (status === 'idle' ||
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
                {status === 'done' && row?.downloadUrl != null && canShare && (
                    <Button
                        variant="secondary"
                        className="md:hidden"
                        aria-label={t('print.share_of', { part: name })}
                        onClick={() => {
                            void navigator
                                .share({
                                    title: name,
                                    url: new URL(
                                        row.downloadUrl ?? '',
                                        window.location.href,
                                    ).href,
                                })
                                .catch(() => undefined);
                        }}
                    >
                        {t('print.share')}
                    </Button>
                )}
                {status === 'done' && row?.imageUrl != null && (
                    <Button variant="secondary" asChild>
                        <a
                            href={row.imageUrl}
                            aria-label={t('print.png_of', { part: name })}
                        >
                            {t('print.png')}
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
            {!skipped && status === 'failed' && (
                <p className="basis-full text-sm font-semibold text-press">
                    {t(`print.reason.${failureReason(row?.reason)}`)}
                </p>
            )}
        </li>
    );
}

const REASONS = ['timeout', 'photos', 'layout', 'edition', 'other'] as const;

/** The reason code from the server, or `other` for anything it does not know (an older run). */
function failureReason(reason: string | null | undefined): string {
    return REASONS.find((known) => known === reason) ?? 'other';
}

type Shown = PrintPartStatusData['status'] | 'skipped';

/** A shape next to the words, so the status never rests on colour alone (B98). */
const GLYPH: Record<Shown, string> = {
    idle: '○',
    skipped: '–',
    waiting: '…',
    running: '◐',
    done: '✓',
    failed: '!',
    outdated: '↻',
};

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
    status: Shown,
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
            return t('print.status.idle');
        case 'skipped':
            return t('print.status.skipped');
    }
}
