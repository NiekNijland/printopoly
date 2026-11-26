import { type VariantProps } from 'class-variance-authority';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import {
    createContext,
    useContext,
    type ComponentProps,
    type CSSProperties,
} from 'react';

import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

const ToggleGroupContext = createContext<
    VariantProps<typeof toggleVariants> & { spacing?: number }
>({
    size: 'default',
    variant: 'default',
    spacing: 0,
});

/**
 * shadcn/ui's ToggleGroup in the house style (B195). With `spacing` 0 and the `outline` look the items join into
 * one segmented bar: one 2 px ink frame, thin lines between the items and the printer-red selection inside. With
 * spacing the items stand apart as separate controls (a grid of icons, say). Radix gives the roving focus: Tab
 * enters the group, the arrow keys move, Space or Enter chooses.
 */
const ToggleGroup = ({
    className,
    variant,
    size,
    spacing = 0,
    children,
    ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants> & { spacing?: number }) => {
    return (
        <ToggleGroupPrimitive.Root
            data-slot="toggle-group"
            data-variant={variant}
            data-size={size}
            data-spacing={spacing}
            style={{ '--gap': spacing } as CSSProperties}
            className={cn(
                'group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-control',
                spacing === 0 &&
                    variant === 'outline' &&
                    'overflow-hidden border-2 border-ink bg-card',
                className,
            )}
            {...props}
        >
            <ToggleGroupContext.Provider value={{ variant, size, spacing }}>
                {children}
            </ToggleGroupContext.Provider>
        </ToggleGroupPrimitive.Root>
    );
};

const ToggleGroupItem = ({
    className,
    children,
    variant,
    size,
    ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>) => {
    const context = useContext(ToggleGroupContext);
    const look = context.variant ?? variant;
    const joined = context.spacing === 0;

    return (
        <ToggleGroupPrimitive.Item
            data-slot="toggle-group-item"
            data-variant={look}
            data-size={context.size ?? size}
            data-spacing={context.spacing}
            className={cn(
                toggleVariants({ variant: look, size: context.size ?? size }),
                'min-w-0 shrink-0 focus-visible:z-10',
                joined && 'rounded-none',
                joined &&
                    look === 'outline' &&
                    'border-0 border-l border-line first:border-l-0 focus-visible:-outline-offset-4 data-[state=on]:border-l-transparent data-[state=on]:[&+*]:border-l-transparent',
                className,
            )}
            {...props}
        >
            {children}
        </ToggleGroupPrimitive.Item>
    );
};

export { ToggleGroup, ToggleGroupItem };
