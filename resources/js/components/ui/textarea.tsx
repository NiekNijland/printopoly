import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                'w-full rounded-control border-2 border-ink bg-card px-3 py-2 text-base text-ink placeholder:text-ink-soft aria-invalid:border-press',
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
