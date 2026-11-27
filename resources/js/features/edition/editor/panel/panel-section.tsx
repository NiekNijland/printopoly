import { usePage } from '@inertiajs/react';
import { useId, useState, type ReactNode } from 'react';

import { WarningIcon } from '@/components/icons';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useWideScreen } from '@/hooks/use-media-query';
import type { CheckIssue } from '@/lib/render/checks-types';
import { cn } from '@/lib/utils';

/**
 * The warning of the Controle list, shown again at the element it is about (B94, B98). A warning can carry one
 * action that fixes it in place ("Bedrag aanpassen"), as a text button under the message.
 */
export const FieldIssues = ({
    issues,
    action,
}: {
    issues: readonly CheckIssue[];
    action?: (issue: CheckIssue) => ReactNode;
}) => {
    const { locale } = usePage().props;

    return (
        <>
            {issues.map((issue) => {
                const fix = action?.(issue);

                return (
                    <div
                        key={issue.id}
                        className="m-0 flex items-start gap-2 rounded-control border-2 border-ink bg-warning px-3 py-2 text-sm"
                    >
                        <WarningIcon size={18} className="mt-0.5 shrink-0" />
                        <div className="flex min-w-0 flex-col items-start gap-1">
                            <p className="m-0">
                                <strong>{issue.severityLabel[locale]}:</strong>{' '}
                                {issue.message[locale]}
                            </p>
                            {fix}
                        </div>
                    </div>
                );
            })}
        </>
    );
};

type PanelSectionProps = {
    id: string;
    title: string;
    /** A short line for the closed block on a phone: "Foto, in kader", "geen foto". */
    summary?: string;
    /** A number next to the title, such as the count of contributions. */
    badge?: ReactNode;
    /** A note in mono next to the title. */
    note?: string;
    /** Open at first on a phone; the first section of a panel is. */
    defaultOpen?: boolean;
    children: ReactNode;
};

const PanelSectionHeading = ({
    id,
    title,
    summary,
    badge,
    note,
    wide,
    open,
}: Omit<PanelSectionProps, 'children' | 'defaultOpen'> & {
    wide: boolean;
    open: boolean;
}) => (
    <h3
        id={id}
        className={cn(
            'm-0 font-display text-lg font-extrabold',
            wide && 'mb-3 flex items-center gap-2',
        )}
    >
        {wide ? (
            <>
                {title}
                {note !== undefined && (
                    <span className="font-mono text-xs font-medium text-ink-soft">
                        {note}
                    </span>
                )}
                {badge}
            </>
        ) : (
            <CollapsibleTrigger className="flex min-h-12 w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 text-left font-display text-lg font-extrabold text-ink">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="flex-none">{title}</span>
                    {badge}
                    {!open && summary !== undefined && (
                        <span
                            data-section-summary
                            className="min-w-0 truncate font-sans text-xs font-semibold text-ink-soft"
                        >
                            <span aria-hidden="true">· </span>
                            {summary}
                        </span>
                    )}
                </span>
                <span
                    aria-hidden="true"
                    className="w-4 flex-none text-center font-sans text-base"
                >
                    {open ? '−' : '+'}
                </span>
            </CollapsibleTrigger>
        )}
    </h3>
);

/**
 * One section of the field panel (B141), on shadcn's Collapsible. On a wide screen it is a heading with its fields
 * and always open; on a phone it is a block that opens and closes, and the closed block says what is in it
 * ("Afbeelding · geen foto", vindbaarheid point 2).
 */
export const PanelSection = ({
    id,
    title,
    summary,
    badge,
    note,
    defaultOpen = false,
    children,
}: PanelSectionProps) => {
    const wide = useWideScreen();
    const [open, setOpen] = useState(defaultOpen);
    const shown = wide || open;
    const body = useId();

    return (
        <Collapsible
            asChild
            open={shown}
            onOpenChange={(next) => {
                if (!wide) {
                    setOpen(next);
                }
            }}
        >
            <section
                aria-labelledby={`${body}-title`}
                data-section={id}
                className={cn(
                    'flex flex-col',
                    wide
                        ? 'border-t border-line pt-4 first:border-t-0 first:pt-0'
                        : 'rounded-control border-2 border-ink bg-card',
                )}
            >
                <PanelSectionHeading
                    id={`${body}-title`}
                    title={title}
                    summary={summary}
                    badge={badge}
                    note={note}
                    wide={wide}
                    open={open}
                />
                <CollapsibleContent
                    id={body}
                    forceMount
                    hidden={!shown}
                    className={cn('flex flex-col gap-4', !wide && 'px-3 pb-4')}
                >
                    {children}
                </CollapsibleContent>
            </section>
        </Collapsible>
    );
};
