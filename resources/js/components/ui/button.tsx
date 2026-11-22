import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn/ui's Button in the house style (B88, B195): 48 px high, radius 6, no offset shadows (B87). There is one
 * primary button per screen (Stijlgids). The house names stay (`primary`, `secondary` with an ink border, `icon`,
 * `warning`) next to shadcn's own (`default`, `outline`, `destructive`, `link`), so shadcn components that use
 * `buttonVariants` render in the same style.
 */
const buttonVariants = cva(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control text-base font-semibold whitespace-nowrap no-underline transition-colors disabled:cursor-not-allowed aria-disabled:cursor-not-allowed',
    {
        variants: {
            variant: {
                default:
                    'border-0 bg-press px-4 text-white hover:bg-press/90 disabled:bg-ink-soft min-[400px]:px-6',
                primary:
                    'border-0 bg-press px-4 text-white hover:bg-press/90 disabled:bg-ink-soft min-[400px]:px-6',
                destructive:
                    'border-0 bg-press px-4 text-white hover:bg-press/90 disabled:bg-ink-soft min-[400px]:px-6',
                secondary:
                    'border-2 border-ink bg-transparent px-4 text-ink hover:bg-card disabled:border-line-strong disabled:text-ink-soft min-[400px]:px-6',
                outline:
                    'border-2 border-ink bg-transparent px-4 text-ink hover:bg-card disabled:border-line-strong disabled:text-ink-soft min-[400px]:px-6',
                icon: 'size-12 border-2 border-ink bg-transparent p-0 text-ink hover:bg-card disabled:border-line-strong disabled:text-ink-soft',
                warning: 'border-2 border-ink bg-warning px-4 text-ink',
                ghost: 'border-0 bg-transparent px-3 text-ink hover:bg-card',
                link: 'h-auto border-0 bg-transparent px-0 text-ink underline underline-offset-4 hover:text-press',
            },
            size: {
                default: 'h-12',
                compact: 'h-12 px-4',
                sm: 'h-10 px-3 text-sm min-[400px]:px-4',
                lg: 'h-14 px-6 text-lg',
                icon: 'size-12 px-0 min-[400px]:px-0',
                'icon-sm': 'size-10 px-0 min-[400px]:px-0',
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
    const Component = asChild ? Slot.Root : 'button';

    return (
        <Component
            data-slot="button"
            data-variant={variant ?? 'primary'}
            data-size={size ?? 'default'}
            className={cn(buttonVariants({ variant, size }), className)}
            {...(asChild ? {} : { type: type ?? 'button' })}
            {...props}
        />
    );
}

export { Button, buttonVariants };
