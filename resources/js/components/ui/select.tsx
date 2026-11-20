import type { ComponentProps } from 'react';

import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * A native select in the field style. Native keeps the phone's own picker
 * (B86) and needs no extra accessibility work.
 */
function Select({ className, children, ...props }: ComponentProps<'select'>) {
    return (
        <span className={cn('relative inline-flex w-full', className)}>
            <select
                data-slot="select"
                className="h-12 w-full cursor-pointer appearance-none rounded-control border-2 border-ink bg-card pr-10 pl-3 text-base text-ink disabled:cursor-not-allowed disabled:border-line-strong disabled:text-ink-muted"
                {...props}
            >
                {children}
            </select>
            <ChevronDownIcon
                size={16}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink"
            />
        </span>
    );
}

export { Select };
