import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

/**
 * Adapter for the callers of the segmented bar (B195): shadcn's Tabs with the `segmented` look. The root stays a
 * plain block, as before; new code uses `Tabs` with `<TabsList variant="segmented">`.
 */
function SegmentedTabs({ className, ...props }: ComponentProps<typeof Tabs>) {
    return (
        <Tabs
            data-slot="segmented-tabs"
            className={cn('block', className)}
            {...props}
        />
    );
}

function SegmentedTabsList(props: ComponentProps<typeof TabsList>) {
    return (
        <TabsList
            data-slot="segmented-tabs-list"
            variant="segmented"
            {...props}
        />
    );
}

export {
    SegmentedTabs,
    TabsContent as SegmentedTabsContent,
    SegmentedTabsList,
    TabsTrigger as SegmentedTabsTrigger,
};
