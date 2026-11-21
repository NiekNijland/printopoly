import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ChoiceLineProps {
    title: string;
    /** What is chosen now, said in one line while the block is closed. */
    summary: string;
    open: boolean;
    onToggle: () => void;
    changeLabel: string;
    collapseLabel: string;
    children: ReactNode;
}

/**
 * A choice that is already made, folded into one line: "Thema: Klassiek · Wijzigen". Opening it shows the
 * choices themselves. Used on the new edition screen for the theme and the parts.
 */
export function ChoiceLine({
    title,
    summary,
    open,
    onToggle,
    changeLabel,
    collapseLabel,
    children,
}: ChoiceLineProps) {
    const id = useId();

    return (
        <div
            className={cn(
                'rounded-control border-2 border-ink bg-card',
                'motion-safe:transition-shadow motion-safe:duration-200',
                open && 'shadow-paper',
            )}
        >
            <button
                type="button"
                aria-expanded={open}
                aria-controls={id}
                onClick={onToggle}
                className="flex min-h-14 w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-transparent px-4 py-3 text-left font-[inherit] text-ink focus-visible:outline-3 focus-visible:outline-offset-2"
            >
                <span className="font-display text-lg font-extrabold">
                    {title}
                </span>
                <span className="min-w-0 flex-1 text-ink-soft">{summary}</span>
                <span className="font-semibold underline underline-offset-4">
                    {open ? collapseLabel : changeLabel}
                </span>
            </button>
            <div
                id={id}
                hidden={!open}
                className="flex flex-col gap-3 border-t-2 border-ink px-4 py-4"
            >
                {open && children}
            </div>
        </div>
    );
}
