import type { ComponentProps } from 'react';

import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * shadcn/ui's NativeSelect in the house field style (B86, B195): a real `<select>`, so a phone shows its own
 * picker, 48 px high with a 2 px ink border. `wrapperClassName` sizes the box around it.
 */
function NativeSelect({
    className,
    wrapperClassName,
    ...props
}: ComponentProps<'select'> & { wrapperClassName?: string }) {
    return (
        <span
            data-slot="native-select-wrapper"
            className={cn(
                'group/native-select relative inline-flex w-full',
                wrapperClassName,
            )}
        >
            <select
                data-slot="native-select"
                className={cn(
                    'h-12 w-full cursor-pointer appearance-none rounded-control border-2 border-ink bg-card pr-10 pl-3 text-base text-ink disabled:cursor-not-allowed disabled:border-line-strong disabled:text-ink-muted aria-invalid:border-press',
                    className,
                )}
                {...props}
            />
            <ChevronDownIcon
                size={16}
                data-slot="native-select-icon"
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink"
            />
        </span>
    );
}

function NativeSelectOption(props: ComponentProps<'option'>) {
    return <option data-slot="native-select-option" {...props} />;
}

function NativeSelectOptGroup(props: ComponentProps<'optgroup'>) {
    return <optgroup data-slot="native-select-optgroup" {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
