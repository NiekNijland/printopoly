import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Buttons are 48 px high with radius 6 (B88). There is one primary button per
 * screen (Stijlgids); no offset shadows (B87).
 */
const buttonVariants = cva(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control text-base font-semibold whitespace-nowrap no-underline transition-colors disabled:cursor-not-allowed aria-disabled:cursor-not-allowed',
    {
        variants: {
            variant: {
                primary:
                    'border-0 bg-press px-4 text-white min-[400px]:px-6 hover:bg-press/90 disabled:bg-ink-muted',
                secondary:
                    'border-2 border-ink bg-transparent px-4 text-ink hover:bg-card min-[400px]:px-6 disabled:border-line-strong disabled:text-ink-muted',
                icon: 'size-12 border-2 border-ink bg-transparent p-0 text-ink hover:bg-card disabled:border-line-strong disabled:text-ink-muted',
                warning: 'border-2 border-ink bg-warning px-4 text-ink',
                ghost: 'border-0 bg-transparent px-3 text-ink hover:bg-card',
            },
            size: {
                default: 'h-12',
                compact: 'h-12 px-4',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'default',
        },
    },
);

type ButtonProps = ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        /** Render the child element (a link, say) with the button styles. */
        asChild?: boolean;
    };

function Button({
    className,
    variant,
    size,
    asChild = false,
    type,
    ...props
}: ButtonProps) {
    const Component = asChild ? Slot : 'button';

    return (
        <Component
            data-slot="button"
            className={cn(buttonVariants({ variant, size }), className)}
            {...(asChild ? {} : { type: type ?? 'button' })}
            {...props}
        />
    );
}

export { Button };
