import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type InputProps = ComponentProps<'input'> & {
    /**
     * A unit shown after the value, such as "mm". Values with a unit are set
     * in mono (B87).
     */
    unit?: string;
};

const fieldClasses =
    'h-12 w-full rounded-control border-2 border-ink bg-card px-3 text-base text-ink placeholder:text-ink-soft disabled:cursor-not-allowed disabled:border-line-strong disabled:text-ink-soft aria-invalid:border-press';

function Input({ className, unit, type = 'text', ...props }: InputProps) {
    if (unit === undefined) {
        return (
            <input
                type={type}
                data-slot="input"
                className={cn(fieldClasses, className)}
                {...props}
            />
        );
    }

    return (
        <span
            data-slot="input"
            className={cn(
                'flex h-12 w-full items-center rounded-control border-2 border-ink bg-card has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink has-[[aria-invalid=true]]:border-press',
                className,
            )}
        >
            <input
                type={type}
                className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-base text-ink focus-visible:outline-none"
                {...props}
            />
            <span aria-hidden="true" className="px-3 font-mono text-ink-soft">
                {unit}
            </span>
        </span>
    );
}

export { Input };
