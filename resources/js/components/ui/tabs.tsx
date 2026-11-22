import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { createContext, useContext, type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn/ui's Tabs in the house style (B195). Three looks:
 * - `segmented`: equal tabs in one bar with a 2 px ink border, the chosen one inked (Stijlgids "Tabs",
 *   Editor-mobiel "Vak / Eigendomsbewijs"). `SegmentedTabs` uses it.
 * - `default`: shadcn's pill bar, on the table colour with the chosen tab on card.
 * - `line`: text tabs with a printer-red line under the chosen one.
 * Radix provides the tablist semantics and arrow-key navigation.
 */
function Tabs({
    className,
    orientation = 'horizontal',
    ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            data-orientation={orientation}
            orientation={orientation}
            className={cn(
                'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col',
                className,
            )}
            {...props}
        />
    );
}

const tabsListVariants = cva('group/tabs-list text-ink', {
    variants: {
        variant: {
            default:
                'inline-flex w-fit items-center justify-center gap-1 rounded-control bg-table p-1',
            line: 'inline-flex w-fit items-center gap-4 border-b border-line',
            segmented:
                'grid auto-cols-fr grid-flow-col overflow-hidden rounded-control border-2 border-ink bg-card',
        },
    },
    defaultVariants: { variant: 'default' },
});

const tabsTriggerVariants = cva(
    'cursor-pointer text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:text-ink-soft',
    {
        variants: {
            variant: {
                default:
                    'inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-control px-3 whitespace-nowrap hover:bg-card/60 data-[state=active]:bg-card',
                line: 'relative inline-flex h-12 items-center gap-1.5 whitespace-nowrap after:absolute after:inset-x-0 after:bottom-[-1px] after:h-[3px] after:bg-press after:opacity-0 data-[state=active]:after:opacity-100',
                segmented:
                    'h-11 bg-card px-2 focus-visible:-outline-offset-4 data-[state=active]:bg-ink data-[state=active]:text-paper data-[state=active]:focus-visible:outline-paper min-[360px]:px-3 min-[360px]:text-base',
            },
        },
        defaultVariants: { variant: 'default' },
    },
);

type TabsVariant = NonNullable<
    VariantProps<typeof tabsListVariants>['variant']
>;

const TabsVariantContext = createContext<TabsVariant>('default');

function TabsList({
    className,
    variant = 'default',
    ...props
}: ComponentProps<typeof TabsPrimitive.List> &
    VariantProps<typeof tabsListVariants>) {
    const look = variant ?? 'default';

    return (
        <TabsVariantContext.Provider value={look}>
            <TabsPrimitive.List
                data-slot="tabs-list"
                data-variant={look}
                className={cn(tabsListVariants({ variant: look }), className)}
                {...props}
            />
        </TabsVariantContext.Provider>
    );
}

function TabsTrigger({
    className,
    ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
    const variant = useContext(TabsVariantContext);

    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(tabsTriggerVariants({ variant }), className)}
            {...props}
        />
    );
}

function TabsContent({
    className,
    ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot="tabs-content"
            className={cn('flex-1', className)}
            {...props}
        />
    );
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
