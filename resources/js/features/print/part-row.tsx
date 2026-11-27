import { useId, type ReactNode } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { PartActions } from '@/features/print/part-actions';
import {
    PartStatusBadge,
    type Shown,
} from '@/features/print/part-status-badge';
import { PartThumb } from '@/features/print/part-thumb';
import { canShareFiles } from '@/features/print/share-set-button';
import { useBrowserValue } from '@/hooks/use-browser-value';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition } from '@/lib/render/edition-types';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
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

type PartRowProps = {
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
    /** What to order, when a choice in the row changes it (the whole board, B243); the standard line without it. */
    order?: string;
    /** A choice that belongs to the part, under the row (how much play money, B156). */
    children?: ReactNode;
};

const TURN = ['md:-rotate-2', 'md:rotate-1', 'md:-rotate-1', 'md:rotate-2'];

const rowLines = (
    t: ReturnType<typeof useTranslation>,
    {
        part,
        set,
        cards,
        trial,
        ownOrder,
        ownSpec,
    }: {
        part: PrintPart;
        set: PrintSet;
        cards: number;
        trial: boolean;
        ownOrder: string | undefined;
        ownSpec: string | undefined;
    },
) => {
    const name = t(`print.part.${part}`);
    const title = trial ? t('print.trial.title') : name;
    // The home set prints the rest itself: its test sheet says "print", not "order" (R5-26).
    const order =
        ownOrder ??
        (part === 'calibration'
            ? t(
                  set === 'home'
                      ? 'print.order.calibration_home'
                      : 'print.order.calibration',
              )
            : t(`print.order.${set}.${part}`));
    const spec =
        ownSpec ??
        (part === 'calibration'
            ? t('print.spec.calibration')
            : t(`print.spec.${set}.${part}`, { cards }));

    return { name, title, order, spec };
};

type PartHeadsProps = {
    tickId: string | null;
    lockId: string;
    part: PrintPart;
    edition: Edition;
    photos: PhotoInfos | undefined;
    trial: boolean;
    index: number;
    skipped: boolean;
    locked: boolean;
    title: string;
    order: string;
    note: string | undefined;
    spec: string;
};

const PartHeads = ({
    tickId,
    lockId,
    part,
    edition,
    photos,
    trial,
    index,
    skipped,
    locked,
    title,
    order,
    note,
    spec,
}: PartHeadsProps) => {
    const t = useTranslation();
    const Head = tickId === null ? 'span' : 'label';
    const headProps =
        tickId === null
            ? { className: '' }
            : { htmlFor: tickId, className: 'cursor-pointer' };

    return (
        <>
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
        </>
    );
};

const rowState = (
    t: ReturnType<typeof useTranslation>,
    props: Pick<
        PartRowProps,
        'part' | 'set' | 'row' | 'included' | 'queued' | 'variant' | 'cards'
    > & { ownOrder: string | undefined; ownSpec: string | undefined },
) => {
    const { part, row, included, queued = false, variant = 'row' } = props;
    const status = row?.status ?? 'idle';
    const trial = variant === 'trial';
    const lines = rowLines(t, { ...props, trial });
    const skipped = included === false;
    const inLine =
        queued &&
        !skipped &&
        (status === 'idle' || status === 'outdated' || status === 'failed');
    const shown: Shown = skipped ? 'skipped' : inLine ? 'queued' : status;

    return { ...lines, part, status, trial, skipped, inLine, shown };
};

const RowFrame = ({
    part,
    asked,
    skipped,
    children,
}: {
    part: PrintPart;
    asked: boolean;
    skipped: boolean;
    children: ReactNode;
}) => (
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
        {children}
    </li>
);

const RowNotes = ({
    failed,
    reason,
    children,
}: {
    failed: boolean;
    reason: string | null | undefined;
    children: ReactNode;
}) => {
    const t = useTranslation();

    return (
        <>
            {failed && (
                <p className="basis-full text-sm font-semibold text-press">
                    {t(`print.reason.${failureReason(reason)}`)}
                </p>
            )}
            {children !== undefined && (
                <div className="basis-full md:pl-[calc(1.25rem+7rem+2.5rem)]">
                    {children}
                </div>
            )}
        </>
    );
};

/**
 * One row of the print page (B95): a tick for whether it is in the set (B198), name, what to order, the spec in
 * mono, the status as text and the buttons that fit the status, and a link to the part in the print guide (B205).
 * Colour never carries the status alone (B98).
 */
export const PartRow = (props: PartRowProps) => {
    const { part, row, included, locked = false, children } = props;
    const t = useTranslation();
    const lockId = useId();
    const tickId = useId();
    const state = rowState(t, {
        ...props,
        ownOrder: props.order,
        ownSpec: props.spec,
    });
    const { name, skipped, inLine, status } = state;
    // Checked after the first render, like the bar: the server knows nothing of the phone.
    const shareFiles = useBrowserValue(canShareFiles, false);
    // The picture and the name tick the box too (R5-27, Gerda): the whole head of the row is one big target.
    const tickable = included !== null && !locked;

    return (
        <RowFrame part={part} asked={props.asked ?? false} skipped={skipped}>
            {included === null ? (
                <span
                    className="hidden w-5 flex-none md:block"
                    aria-hidden="true"
                />
            ) : (
                // The label gives the box a 48 px tap area without moving the row.
                <label
                    htmlFor={tickId}
                    className="-m-3 flex size-12 flex-none cursor-pointer items-center justify-center has-disabled:cursor-default"
                >
                    <Checkbox
                        id={tickId}
                        checked={included}
                        disabled={locked}
                        onCheckedChange={props.onToggle}
                        aria-label={t('print.in_set', { part: name })}
                        aria-describedby={locked ? lockId : undefined}
                        // Locked but ticked: the board reads as in the set, not as switched off.
                        className="size-6 disabled:border-solid disabled:border-ink data-[state=checked]:disabled:opacity-60 [&_svg]:size-5"
                    />
                </label>
            )}
            <PartHeads
                {...state}
                tickId={tickable ? tickId : null}
                lockId={lockId}
                edition={props.edition}
                photos={props.photos}
                index={props.index ?? 0}
                locked={locked}
                note={props.note}
            />
            <PartStatusBadge
                shown={state.shown}
                waitingFor={row?.waitingFor ?? null}
            />
            <PartActions
                {...state}
                row={row}
                disabled={props.disabled}
                shareFiles={shareFiles}
                guideHref={props.guideHref}
                onMake={props.onMake}
                onUnqueue={props.onUnqueue}
            />
            <RowNotes
                failed={!skipped && !inLine && status === 'failed'}
                reason={row?.reason}
            >
                {skipped ? undefined : children}
            </RowNotes>
        </RowFrame>
    );
};

const REASONS = ['timeout', 'photos', 'layout', 'edition', 'other'] as const;

/** The reason code from the server, or `other` for anything it does not know (an older run). */
const failureReason = (reason: string | null | undefined): string => {
    return REASONS.find((known) => known === reason) ?? 'other';
};
