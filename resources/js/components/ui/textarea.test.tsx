import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Textarea } from '@/components/ui/textarea';

describe('Textarea', () => {
    it('is a text box the visitor types into', async () => {
        const user = userEvent.setup();
        render(<Textarea aria-label="Story" />);
        const box = screen.getByRole('textbox', { name: 'Story' });

        await user.type(box, 'Go to jail');

        expect(box).toHaveValue('Go to jail');
        expect(box.tagName).toBe('TEXTAREA');
    });

    it('has the house border and takes the caller classes', () => {
        render(<Textarea aria-label="Notes" className="min-h-32" />);

        const box = screen.getByRole('textbox');
        expect(box).toHaveAttribute('data-slot', 'textarea');
        expect(box).toHaveClass('border-2', 'border-ink', 'min-h-32');
    });
});
