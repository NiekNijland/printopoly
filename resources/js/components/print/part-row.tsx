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
    /** Asked for while a run is going: it waits in this browser and starts after that run. */
    queued?: boolean;
    /** Takes the part out of the line again. */
    onUnqueue?: () => void;
    /** A run is busy or a request is on its way: nothing new starts. */
    disabled: boolean;
    cards: number;
    /** The edition to draw the part from. */
    edition: Edition;
    /** The photos of this browser, for the thumbnail. */
    photos?: PhotoInfos;
    /** A line that goes with the part, such as the house rules card that prints with the cards. */
    note?: string;
    /** The test sheet is a card of its own above the groups, with its own name and button (B149). */
    variant?: 'row' | 'trial';
    /** Which row this is in the list; every sheet lies a little differently on the table. */
    index?: number;
}

const TURN = ['md:-rotate-2', 'md:rotate-1', 'md:-rotate-1', 'md:rotate-2'];

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
    queued = false,
    onUnqueue,
    disabled,
    cards,
    edition,
    photos,
    note,
    variant = 'row',
    index = 0,
}: PartRowProps) {
    const t = useTranslation();
    const status = row?.status ?? 'idle';
    const trial = variant === 'trial';
    const name = t(`print.part.${part}`);
    const title = trial ? t('print.trial.title') : name;
    const order =
        part === 'calibration'
            ? t('print.order.calibration')
            : t(`print.order.${set}.${part}`);
    const spec =
        part === 'calibration'
            ? t('print.spec.calibration')
            : t(`print.spec.${set}.${part}`, {
                  cards,
                  // Nine cards per A4 sheet, printed on both sides (B134).
                  sheets: Math.ceil(cards / 9),
              });

    const skipped = included === false;
    const inLine =
        queued &&
        !skipped &&
        (status === 'idle' || status === 'outdated' || status === 'failed');
    const shown: Shown = skipped ? 'skipped' : inLine ? 'queued' : status;
    const canShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function';

    return (
        <li
            className={cn(
                'relative flex flex-wrap items-center gap-x-4 gap-y-3 border-2 border-ink bg-card py-4 pr-4 pl-6 shadow-print md:gap-x-5',
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
                // The label gives the small box a 44 px tap area without moving the row.
                <label className="-m-3 flex size-11 flex-none cursor-pointer items-center justify-center">
                    <input
                        type="checkbox"
                        checked={included}
                        onChange={onToggle}
                        aria-label={t('print.include', { part: name })}
                        className="size-5 flex-none accent-press"
                    />
                </label>
            )}
            <span
                className={cn(
                    'flex size-[72px] flex-none items-center justify-center border border-line-strong shadow-print md:size-28',
                    TILE[part],
                    !trial && TURN[index % TURN.length],
                    skipped && 'opacity-40 shadow-none grayscale',
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
                        size={72}
                        photos={photos}
                    />
                </span>
            </span>
            <span className="flex min-w-0 flex-[1_1_9rem] flex-col gap-0.5 md:flex-[1_1_14rem]">
                <strong className="font-display text-xl leading-tight font-extrabold">
                    {title}
                </strong>
                <span className="text-sm">{order}</span>
                {note !== undefined && (
                    <span className="text-sm font-semibold">{note}</span>
                )}
                <span className="font-mono text-xs text-ink-soft">{spec}</span>
            </span>
            <span
                aria-live="polite"
                className={cn(
                    'inline-flex items-center gap-2 border-2 border-ink px-2 py-0.5 text-xs font-extrabold tracking-wide uppercase',
                    shown === 'done' && 'bg-print-green text-ink',
                    shown === 'failed' && 'bg-press text-white',
                    (shown === 'running' ||
                        shown === 'waiting' ||
                        shown === 'queued') &&
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
                {inLine && (
                    <Button
                        variant="ghost"
                        className="underline underline-offset-4"
                        onClick={onUnqueue}
                        aria-label={`${t('print.unqueue')}: ${name}`}
                    >
                        {t('print.unqueue')}
                    </Button>
                )}
                {!skipped &&
                    !inLine &&
                    (status === 'idle' ||
                        status === 'outdated' ||
                        status === 'failed') && (
                        <Button
                            variant={
                                trial || status !== 'idle'
                                    ? 'secondary'
                                    : 'ghost'
                            }
                            className={cn(
                                !trial &&
                                    status === 'idle' &&
                                    'underline underline-offset-4',
                            )}
                            onClick={onMake}
                            disabled={disabled}
                            aria-label={`${actionLabel(status, t, trial)}: ${name}`}
                        >
                            {actionLabel(status, t, trial)}
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
            {!skipped && !inLine && status === 'failed' && (
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

type Shown = PrintPartStatusData['status'] | 'skipped' | 'queued';

/** A shape next to the words, so the status never rests on colour alone (B98). */
const GLYPH: Record<Shown, string> = {
    idle: '○',
    skipped: '–',
    waiting: '…',
    queued: '…',
    running: '◐',
    done: '✓',
    failed: '!',
    outdated: '↻',
};

function actionLabel(
    status: 'idle' | 'outdated' | 'failed',
    t: (key: string) => string,
    trial: boolean,
): string {
    if (status === 'failed') {
        return t('print.retry');
    }

    if (status === 'outdated') {
        return t('print.remake');
    }

    return trial ? t('print.make_trial') : t('print.make_part');
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
}
