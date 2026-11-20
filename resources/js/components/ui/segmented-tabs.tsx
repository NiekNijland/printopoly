import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Two or more equal tabs in one bordered bar; the chosen one is inked
 * (Stijlgids "Tabs", Editor-mobiel "Vak / Eigendomsbewijs"). Radix provides
 * the tablist semantics and arrow-key navigation.
 */
function SegmentedTabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
    return <TabsPrimitive.Root data-slot="segmented-tabs" {...props} />;
}

function SegmentedTabsList({
    className,
    ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            data-slot="segmented-tabs-list"
            className={cn(
                'grid auto-cols-fr grid-flow-col overflow-hidden rounded-control border-2 border-ink bg-card',
                className,
            )}
            {...props}
        />
    );
}

function SegmentedTabsTrigger({
    className,
    ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="segmented-tabs-trigger"
            className={cn(
                'h-11 cursor-pointer bg-card px-3 text-base font-semibold text-ink focus-visible:-outline-offset-4 data-[state=active]:bg-ink data-[state=active]:text-paper data-[state=active]:focus-visible:outline-paper',
                className,
            )}
            {...props}
        />
    );
}

function SegmentedTabsContent(
    props: ComponentProps<typeof TabsPrimitive.Content>,
) {
    return (
        <TabsPrimitive.Content data-slot="segmented-tabs-content" {...props} />
    );
}

export {
    SegmentedTabs,
    SegmentedTabsContent,
    SegmentedTabsList,
    SegmentedTabsTrigger,
};
