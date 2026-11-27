import { describe, expect, it } from 'vitest';

import { toggleVariants } from '@/components/ui/toggle';

const classes = (value: string): string[] => value.split(' ');

describe('toggleVariants', () => {
    it('is a borderless 48 px control by default with the red on-state', () => {
        const value = classes(toggleVariants());

        expect(value).toEqual(
            expect.arrayContaining([
                'bg-transparent',
                'h-12',
                'min-w-12',
                'data-[state=on]:text-press',
            ]),
        );
        expect(value).not.toContain('border-2');
    });

    it('draws the ink border for outline and a red frame when on', () => {
        expect(classes(toggleVariants({ variant: 'outline' }))).toEqual(
            expect.arrayContaining([
                'border-2',
                'border-ink',
                'data-[state=on]:border-press',
            ]),
        );
    });

    it('has a small and a large size', () => {
        const small = classes(toggleVariants({ size: 'sm' }));
        const large = classes(toggleVariants({ size: 'lg' }));

        expect(small).toEqual(expect.arrayContaining(['h-10', 'text-sm']));
        expect(small).not.toContain('h-12');
        expect(large).toEqual(expect.arrayContaining(['h-14', 'px-4']));
    });

    it('adds the caller class last', () => {
        expect(classes(toggleVariants({ className: 'w-full' })).at(-1)).toBe(
            'w-full',
        );
    });
});
