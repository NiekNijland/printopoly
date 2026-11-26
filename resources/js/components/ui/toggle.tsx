import { cva } from 'class-variance-authority';

/**
 * The variants of shadcn/ui's Toggle in the house style, used by the toggle group (B88, B195): 48 px high, radius
 * 6, 16 px semibold type. `outline` has the 2 px ink border of a control. "On" is the printer-red selection of the design: a red frame inside the control
 * and red text, the same as a chosen theme or swatch.
 */
const toggleVariants = cva(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-control text-base font-semibold whitespace-nowrap text-ink transition-[color,background-color,box-shadow] disabled:cursor-not-allowed disabled:text-ink-soft data-[state=on]:bg-paper data-[state=on]:text-press data-[state=on]:shadow-[inset_0_0_0_3px_var(--color-press)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
    {
        variants: {
            variant: {
                default: 'bg-transparent hover:bg-table',
                outline:
                    'border-2 border-ink bg-card hover:bg-table data-[state=on]:border-press',
            },
            size: {
                default: 'h-12 min-w-12 px-3',
                sm: 'h-10 min-w-10 px-2 text-sm',
                lg: 'h-14 min-w-14 px-4',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export { toggleVariants };
