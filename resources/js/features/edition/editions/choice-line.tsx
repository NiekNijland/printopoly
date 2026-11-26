import type { ReactNode } from 'react';

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type ChoiceLineProps = {
    title: string;
    /** What is chosen now, said in one line while the block is closed. */
    summary: string;
    open: boolean;
    onToggle: () => void;
    changeLabel: string;
    collapseLabel: string;
    children: ReactNode;
};

/**
 * A choice that is already made, folded into one line: "Thema: Klassiek · Wijzigen" (B150). Opening it shows the
 * choices themselves. shadcn's Collapsible (B195) on the new edition screen, for the theme and the currency.
 */
export const ChoiceLine = ({
    title,
    summary,
    open,
    onToggle,
    changeLabel,
    collapseLabel,
    children,
}: ChoiceLineProps) => {
    return (
        <Collapsible
            open={open}
            onOpenChange={onToggle}
            className={cn(
                'rounded-control border-2 border-ink bg-card',
                'motion-safe:transition-shadow motion-safe:duration-200',
                open && 'shadow-paper',
            )}
        >
            <CollapsibleTrigger className="flex min-h-14 w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-transparent px-4 py-3 text-left font-[inherit] text-ink focus-visible:outline-3 focus-visible:outline-offset-2">
                <span className="font-display text-lg font-extrabold">
                    {title}
                </span>
                <span className="order-last min-w-0 basis-full text-ink-soft sm:order-none sm:flex-1 sm:basis-0">
                    {summary}
                </span>
                <span className="ml-auto font-semibold underline underline-offset-4">
                    {open ? collapseLabel : changeLabel}
                </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 border-t-2 border-ink px-4 py-4">
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
};
