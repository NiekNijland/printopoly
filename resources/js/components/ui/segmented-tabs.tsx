import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

import { Tabs, TabsList, TabsTrigger } from './tabs';

/**
 * Adapter for the callers of the segmented bar (B195): shadcn's Tabs with the `segmented` look. The root stays a
 * plain block, as before; new code uses `Tabs` with `<TabsList variant="segmented">`.
 */
const SegmentedTabs = ({
    className,
    ...props
}: ComponentProps<typeof Tabs>) => {
    return (
        <Tabs
            data-slot="segmented-tabs"
            className={cn('block', className)}
            {...props}
        />
    );
};

const SegmentedTabsList = (props: ComponentProps<typeof TabsList>) => {
    return (
        <TabsList
            data-slot="segmented-tabs-list"
            variant="segmented"
            {...props}
        />
    );
};

export {
    SegmentedTabs,
    SegmentedTabsList,
    TabsTrigger as SegmentedTabsTrigger,
};
