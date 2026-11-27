import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from '@/components/ui/checkbox';

describe('Checkbox', () => {
    it('is a checkbox that ticks on a click and shows its indicator', async () => {
        const user = userEvent.setup();
        const onCheckedChange =
            vi.fn<(checked: boolean | 'indeterminate') => void>();
        render(
            <Checkbox
                aria-label="Free parking"
                onCheckedChange={onCheckedChange}
            />,
        );
        const box = screen.getByRole('checkbox', { name: 'Free parking' });

        expect(box).not.toBeChecked();
        expect(box).toHaveAttribute('data-slot', 'checkbox');
        expect(
            box.querySelector('[data-slot="checkbox-indicator"]'),
        ).toBeNull();

        await user.click(box);

        expect(box).toBeChecked();
        expect(box).toHaveAttribute('data-state', 'checked');
        expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
        expect(
            box.querySelector('[data-slot="checkbox-indicator"]'),
        ).not.toBeNull();
    });

    it('toggles with the space bar', async () => {
        const user = userEvent.setup();
        render(<Checkbox aria-label="Auction" defaultChecked />);
        const box = screen.getByRole('checkbox', { name: 'Auction' });

        box.focus();
        await user.keyboard(' ');

        expect(box).not.toBeChecked();
    });

    it('does not change when disabled', async () => {
        const user = userEvent.setup();
        render(<Checkbox aria-label="Locked" disabled />);
        const box = screen.getByRole('checkbox', { name: 'Locked' });

        await user.click(box);

        expect(box).toBeDisabled();
        expect(box).not.toBeChecked();
    });

    it('keeps the house style and adds the caller classes', () => {
        render(<Checkbox aria-label="Styled" className="mt-1" />);

        expect(screen.getByRole('checkbox')).toHaveClass(
            'size-5',
            'border-2',
            'mt-1',
        );
    });
});
