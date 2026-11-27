import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

describe('ToggleGroup', () => {
    it('chooses one item and tells its caller', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn<(value: string) => void>();
        render(
            <ToggleGroup
                type="single"
                aria-label="Uitlijning"
                onValueChange={onValueChange}
            >
                <ToggleGroupItem value="left">Links</ToggleGroupItem>
                <ToggleGroupItem value="right">Rechts</ToggleGroupItem>
            </ToggleGroup>,
        );

        await user.click(screen.getByRole('radio', { name: 'Rechts' }));

        expect(screen.getByRole('radio', { name: 'Rechts' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'Links' })).not.toBeChecked();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith('right');
    });

    it('joins outline items into one framed bar without spacing', () => {
        render(
            <ToggleGroup type="multiple" variant="outline" size="sm">
                <ToggleGroupItem value="a">A</ToggleGroupItem>
            </ToggleGroup>,
        );
        const group = screen.getByRole('toolbar');
        const item = screen.getByRole('button', { name: 'A' });

        expect(group).toHaveAttribute('data-spacing', '0');
        expect(group).toHaveClass('overflow-hidden', 'border-2', 'border-ink');
        expect(item).toHaveAttribute('data-variant', 'outline');
        expect(item).toHaveAttribute('data-size', 'sm');
        expect(item).toHaveClass('rounded-none', 'border-l', 'h-10');
    });

    it('keeps items apart with spacing', () => {
        render(
            <ToggleGroup type="multiple" variant="outline" spacing={2}>
                <ToggleGroupItem value="a">A</ToggleGroupItem>
            </ToggleGroup>,
        );
        const group = screen.getByRole('toolbar');
        const item = screen.getByRole('button', { name: 'A' });

        expect(group).toHaveAttribute('data-spacing', '2');
        expect(group).not.toHaveClass('border-2');
        expect(group.style.getPropertyValue('--gap')).toBe('2');
        expect(item).not.toHaveClass('rounded-none');
        expect(item).toHaveClass('border-2');
    });

    it('does not frame a joined bar of the default look', () => {
        render(
            <ToggleGroup type="multiple">
                <ToggleGroupItem value="a">A</ToggleGroupItem>
            </ToggleGroup>,
        );

        expect(screen.getByRole('toolbar')).not.toHaveClass('border-2');
        expect(screen.getByRole('button', { name: 'A' })).toHaveClass(
            'rounded-none',
        );
        expect(screen.getByRole('button', { name: 'A' })).not.toHaveClass(
            'border-l',
        );
    });

    it('lets an item choose its own look when the group sets none', () => {
        render(
            <ToggleGroup type="multiple" spacing={1}>
                <ToggleGroupItem value="a" variant="outline" size="lg">
                    A
                </ToggleGroupItem>
            </ToggleGroup>,
        );
        const item = screen.getByRole('button', { name: 'A' });

        expect(item).toHaveAttribute('data-variant', 'outline');
        expect(item).toHaveAttribute('data-size', 'lg');
        expect(item).toHaveClass('border-2', 'h-14');
    });
});
