import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn/ui's DropdownMenu in the house style (B195): a card with a 2 px ink border, 44 px items in 16 px type and
 * the table colour for the highlighted item. The menu opens at the end of its trigger unless told otherwise.
 */
const DropdownMenu = (
    props: ComponentProps<typeof DropdownMenuPrimitive.Root>,
) => {
    return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
};

const DropdownMenuTrigger = (
    props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>,
) => {
    return (
        <DropdownMenuPrimitive.Trigger
            data-slot="dropdown-menu-trigger"
            {...props}
        />
    );
};

const itemClasses =
    "relative flex min-h-11 cursor-pointer items-center rounded-control px-3 text-base text-ink outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-soft data-[highlighted]:bg-table data-[inset]:pl-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const DropdownMenuContent = ({
    className,
    align = 'end',
    sideOffset = 4,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) => {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
                data-slot="dropdown-menu-content"
                align={align}
                sideOffset={sideOffset}
                className={cn(
                    'z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-44 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-control border-2 border-ink bg-card p-1 text-ink',
                    className,
                )}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    );
};

const DropdownMenuItem = ({
    className,
    inset,
    variant = 'default',
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
    variant?: 'default' | 'destructive';
}) => {
    return (
        <DropdownMenuPrimitive.Item
            data-slot="dropdown-menu-item"
            data-inset={inset}
            data-variant={variant}
            className={cn(
                itemClasses,
                'data-[variant=destructive]:text-press',
                className,
            )}
            {...props}
        />
    );
};

const DropdownMenuLabel = ({
    className,
    inset,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
}) => {
    return (
        <DropdownMenuPrimitive.Label
            data-slot="dropdown-menu-label"
            data-inset={inset}
            className={cn(
                'px-3 py-1.5 text-sm font-semibold text-ink-soft data-[inset]:pl-9',
                className,
            )}
            {...props}
        />
    );
};

const DropdownMenuSeparator = ({
    className,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) => {
    return (
        <DropdownMenuPrimitive.Separator
            data-slot="dropdown-menu-separator"
            className={cn('-mx-1 my-1 h-px bg-line', className)}
            {...props}
        />
    );
};

const DropdownMenuShortcut = ({
    className,
    ...props
}: ComponentProps<'span'>) => {
    return (
        <span
            data-slot="dropdown-menu-shortcut"
            className={cn('ml-auto font-mono text-xs text-ink-soft', className)}
            {...props}
        />
    );
};

export {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
};
