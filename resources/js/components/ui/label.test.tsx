import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Label } from '@/components/ui/label';

describe('Label', () => {
    it('names its field and focuses it on a click', async () => {
        const user = userEvent.setup();
        render(
            <>
                <Label htmlFor="city">City</Label>
                <input id="city" />
            </>,
        );
        const field = screen.getByLabelText('City');

        await user.click(screen.getByText('City'));

        expect(field).toHaveFocus();
    });

    it('carries the house slot and style plus the caller classes', () => {
        render(<Label className="mb-2">Name</Label>);

        const label = screen.getByText('Name');
        expect(label.tagName).toBe('LABEL');
        expect(label).toHaveAttribute('data-slot', 'label');
        expect(label).toHaveClass('font-semibold', 'text-sm', 'mb-2');
    });
});
