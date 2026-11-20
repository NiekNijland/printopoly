import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The theme replaces Tailwind's type scale, so tailwind-merge has to know the
// custom sizes; otherwise `text-hero` and `text-ink` would be merged as one
// group and one of them dropped.
const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            'font-size': [
                {
                    text: [
                        'xs',
                        'sm',
                        'base',
                        'lg',
                        'xl',
                        '2xl',
                        '3xl',
                        'hero',
                    ],
                },
            ],
        },
    },
});

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
