import { CheckIcon } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

const Checkbox = ({
    className,
    ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) => {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            className={cn(
                'peer size-5 shrink-0 cursor-pointer rounded-[4px] border-2 border-input bg-card transition-shadow disabled:cursor-not-allowed disabled:border-line-strong aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary',
                className,
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator
                data-slot="checkbox-indicator"
                className="grid place-content-center text-current transition-none"
            >
                <CheckIcon className="size-4" />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
};

export { Checkbox };
