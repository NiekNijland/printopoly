import { useEffect, useId, useState, type ReactNode } from 'react';

import { PartThumb } from '@/components/print/part-thumb';
import {
    canShareFiles,
    ShareSetButton,
} from '@/components/print/share-set-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    invitation: 'bg-card',
    calibration: 'bg-white',
};

interface PartRowProps {
    set: PrintSet;
    part: PrintPart;
    /** The row from the server; undefined before the first run. */
    row: PrintPartStatusData | undefined;
    /** Whether the part is in the set (B198); null for the test sheet, which is no part of a set. */
    included: boolean | null;
    /** The board is always in the set: its box is ticked and cannot be unticked (vindbaarheid 1.9). */
    locked?: boolean;
    /** The editor sent you to this row ("niet in je set", R6 Kees): it stands out for a moment. */
    asked?: boolean;
    /** The section of the print guide about this part (B205): the explanation lives there, not on the row. */
    guideHref?: string;
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
    /** The spec line in mono, counted from the edition (sheets, sizes); the standard line of the part without it. */
    spec?: string;
    /** A choice that belongs to the part, under the row (how much play money, B156). */
    children?: ReactNode;
}

const TURN = ['md:-rotate-2', 'md:rotate-1', 'md:-rotate-1', 'md:rotate-2'];

/**
 * One row of the print page (B95): a tick for whether it is in the set (B198), name, what to order, the spec in
 * mono, the status as text and the buttons that fit the status, and a link to the part in the print guide (B205).
 * Colour never carries the status alone (B98).
 */
export function PartRow({
    set,
    part,
    row,
    included,
    locked = false,
    asked = false,
    guideHref,
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
    spec: ownSpec,
    children,
}: PartRowProps) {
    const t = useTranslation();
    const lockId = useId();
    const tickId = useId();
    const status = row?.status ?? 'idle';
    const trial = variant === 'trial';
    const name = t(`print.part.${part}`);
    const title = trial ? t('print.trial.title') : name;
    // The home set prints the rest itself: its test sheet says "print", not "order" (R5-26).
    const order =
        part === 'calibration'
            ? t(
                  set === 'home'
                      ? 'print.order.calibration_home'
                      : 'print.order.calibration',
              )
            : t(`print.order.${set}.${part}`);
    const spec =
        ownSpec ??
        (part === 'calibration'
            ? t('print.spec.calibration')
            : t(`print.spec.${set}.${part}`, { cards }));

    const skipped = included === false;
    const inLine =
        queued &&
        !skipped &&
        (status === 'idle' || status === 'outdated' || status === 'failed');
    const shown: Shown = skipped ? 'skipped' : inLine ? 'queued' : status;
    const canShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function';
    // Checked after the first render, like the bar: the server knows nothing of the phone.
    const [shareFiles, setShareFiles] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- only the browser knows whether it can share files
        setShareFiles(canShareFiles());
    }, []);
    // The picture and the name tick the box too (R5-27, Gerda): the whole head of the row is one big target.
    const tickable = included !== null && !locked;
    const Head = tickable ? 'label' : 'span';
    const headProps = tickable
        ? { htmlFor: tickId, className: 'cursor-pointer' }
        : { className: '' };

    return (
        <li
            id={`part-${part}`}
            data-asked={asked ? 'true' : undefined}
            className={cn(
                'relative flex scroll-mt-24 flex-wrap items-center gap-x-4 gap-y-3 border-2 border-ink bg-card py-4 pr-4 pl-6 shadow-print transition-[outline-color] md:gap-x-5',
                skipped && 'bg-paper shadow-none',
                asked
                    ? 'outline-4 outline-offset-4 outline-press'
                    : 'outline-transparent',
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
                // The label gives the box a 48 px tap area without moving the row.
                // eslint-disable-next-line jsx-a11y/label-has-associated-control -- the shadcn Checkbox inside is the control; its name is its aria-label
                <label className="-m-3 flex size-12 flex-none cursor-pointer items-center justify-center has-disabled:cursor-default">
                    <Checkbox
                        id={tickId}
                        checked={included}
                        disabled={locked}
                        onCheckedChange={onToggle}
                        aria-label={t('print.in_set', { part: name })}
                        aria-describedby={locked ? lockId : undefined}
                        // Locked but ticked: the board reads as in the set, not as switched off.
                        className="size-6 disabled:border-solid disabled:border-ink data-[state=checked]:disabled:opacity-60 [&_svg]:size-5"
                    />
                </label>
            )}
            <Head
                {...headProps}
                className={cn(
                    headProps.className,
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
            </Head>
            <Head
                {...headProps}
                className={cn(
                    headProps.className,
                    'flex min-w-0 flex-[1_1_9rem] flex-col gap-0.5 md:flex-[1_1_14rem]',
                )}
            >
                <span className="flex flex-wrap items-baseline gap-x-2">
                    <strong className="font-display text-xl leading-tight font-extrabold">
                        {title}
                    </strong>
                    {locked && (
                        <span
                            id={lockId}
                            className="text-xs font-semibold text-ink-soft"
                        >
                            {t('print.always_in_set')}
                        </span>
                    )}
                </span>
                <span className="text-sm">{order}</span>
                {note !== undefined && (
                    <span className="text-sm font-semibold">{note}</span>
                )}
                <span className="font-mono text-xs text-ink-soft">{spec}</span>
            </Head>
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
                        variant="link"
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
                        // Making a part is the same kind of action everywhere on the page, so it has one look: the
                        // secondary button, as Proefvel maken (R6 Tom). The set button in the bar is the primary one.
                        <Button
                            variant="secondary"
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
                {status === 'done' && row?.imageUrl != null && shareFiles && (
                    // A part with a picture (the invitation) shares the picture itself, not a link to the PDF:
                    // a group app shows a picture at once (R6 Sara).
                    <ShareSetButton
                        files={[
                            {
                                url: row.imageUrl,
                                name: `${part}.png`,
                                type: 'image/png',
                            },
                        ]}
                        title={name}
                        short
                        variant="secondary"
                        label={t('print.share_image_of', { part: name })}
                        className="md:hidden"
                    />
                )}
                {status === 'done' &&
                    row?.downloadUrl != null &&
                    canShare &&
                    !(row.imageUrl != null && shareFiles) && (
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
                {guideHref !== undefined && (
                    <Button variant="link" asChild>
                        <a
                            href={guideHref}
                            aria-label={t('print.guide_link_of', {
                                part: name,
                            })}
                        >
                            {t('print.guide_link')}
                        </a>
                    </Button>
                )}
            </span>
            {!skipped && !inLine && status === 'failed' && (
                <p className="basis-full text-sm font-semibold text-press">
                    {t(`print.reason.${failureReason(row?.reason)}`)}
                </p>
            )}
            {children !== undefined && !skipped && (
                <div className="basis-full md:pl-[calc(1.25rem+7rem+2.5rem)]">
                    {children}
                </div>
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
