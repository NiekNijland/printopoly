import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;

function DropdownMenuContent({
    className,
    ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.Content
                align="end"
                sideOffset={4}
                className={cn(
                    'z-50 min-w-44 rounded-control border-2 border-ink bg-card p-1',
                    className,
                )}
                {...props}
            />
        </MenuPrimitive.Portal>
    );
}

function DropdownMenuItem({
    className,
    ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
    return (
        <MenuPrimitive.Item
            className={cn(
                'flex h-11 cursor-pointer items-center rounded-control px-3 text-base text-ink outline-none data-[highlighted]:bg-table',
                className,
            )}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
};
