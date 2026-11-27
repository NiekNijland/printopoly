import { Slider as SliderPrimitive } from 'radix-ui';
import { useMemo, type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const Slider = ({
    className,
    defaultValue,
    value,
    min = 0,
    max = 100,
    thumbProps,
    ...props
}: ComponentProps<typeof SliderPrimitive.Root> & {
    /** Props for the thumb, the element with role "slider": its name, `data-field` and value text. */
    thumbProps?: ComponentProps<typeof SliderPrimitive.Thumb> &
        Record<`data-${string}`, string | undefined>;
}) => {
    const _values = useMemo(
        () =>
            Array.isArray(value)
                ? value
                : Array.isArray(defaultValue)
                  ? defaultValue
                  : [min, max],
        [value, defaultValue, min, max],
    );

    return (
        <SliderPrimitive.Root
            data-slot="slider"
            defaultValue={defaultValue}
            value={value}
            min={min}
            max={max}
            className={cn(
                'relative flex w-full touch-none items-center select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
                className,
            )}
            {...props}
        >
            <SliderPrimitive.Track
                data-slot="slider-track"
                className={cn(
                    'relative grow overflow-hidden rounded-full bg-table data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5',
                )}
            >
                <SliderPrimitive.Range
                    data-slot="slider-range"
                    className={cn(
                        'absolute bg-ink data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full',
                    )}
                />
            </SliderPrimitive.Track>
            {Array.from({ length: _values.length }, (_, index) => (
                <SliderPrimitive.Thumb
                    data-slot="slider-thumb"
                    key={index}
                    {...thumbProps}
                    className="block size-6 shrink-0 cursor-pointer rounded-full border-2 border-ink bg-card transition-[color,box-shadow] disabled:pointer-events-none disabled:border-line-strong"
                />
            ))}
        </SliderPrimitive.Root>
    );
};

export { Slider };
