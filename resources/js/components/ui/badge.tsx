import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn/ui's Badge with the house variants (B195). Small labels: a count of edited elements in mono ("14/41", Editor tabs),
 * a neutral status, or a warning. Yellow is only for Controle (B92), and a
 * warning always carries text, never colour alone (B98).
 */
const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-control whitespace-nowrap',
    {
        variants: {
            variant: {
                count: 'font-mono text-xs',
                neutral: 'border border-line px-2 text-sm text-ink-soft',
                warning:
                    'border-2 border-ink bg-warning px-2 text-sm font-semibold text-ink',
                danger: 'px-0 text-sm font-semibold text-press',
                /* shadcn's own names, in the house colours. */
                default: 'bg-press px-2 text-sm font-semibold text-white',
                secondary: 'bg-table px-2 text-sm font-semibold text-ink',
                destructive: 'bg-press px-2 text-sm font-semibold text-white',
                outline:
                    'border-2 border-ink px-2 text-sm font-semibold text-ink',
            },
        },
        defaultVariants: {
            variant: 'neutral',
        },
    },
);

const Badge = ({
    className,
    variant,
    asChild = false,
    ...props
}: ComponentProps<'span'> &
    VariantProps<typeof badgeVariants> & { asChild?: boolean }) => {
    const Component = asChild ? Slot.Root : 'span';

    return (
        <Component
            data-slot="badge"
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    );
};

export { Badge };
