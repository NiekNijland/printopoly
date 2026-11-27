import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from '@/components/ui/switch';

describe('Switch', () => {
    it('is a switch that turns on with a click and tells its caller', async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn<(checked: boolean) => void>();
        render(
            <Switch
                aria-label="Dark board"
                onCheckedChange={onCheckedChange}
            />,
        );
        const control = screen.getByRole('switch', { name: 'Dark board' });

        expect(control).not.toBeChecked();
        expect(control).toHaveAttribute('data-state', 'unchecked');

        await user.click(control);

        expect(control).toBeChecked();
        expect(control).toHaveAttribute('data-state', 'checked');
        expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('turns off with the keyboard', async () => {
        const user = userEvent.setup();
        render(<Switch aria-label="Sound" defaultChecked />);
        const control = screen.getByRole('switch', { name: 'Sound' });

        control.focus();
        await user.keyboard('{Enter}');

        expect(control).not.toBeChecked();
    });

    it('is the default size unless asked smaller', () => {
        const { rerender } = render(<Switch aria-label="Size" />);

        expect(screen.getByRole('switch')).toHaveAttribute(
            'data-size',
            'default',
        );
        expect(
            screen
                .getByRole('switch')
                .querySelector('[data-slot="switch-thumb"]'),
        ).not.toBeNull();

        rerender(<Switch aria-label="Size" size="sm" />);

        expect(screen.getByRole('switch')).toHaveAttribute('data-size', 'sm');
    });

    it('ignores a click when disabled', async () => {
        const user = userEvent.setup();
        render(<Switch aria-label="Off" disabled />);

        await user.click(screen.getByRole('switch'));

        expect(screen.getByRole('switch')).not.toBeChecked();
    });
});
