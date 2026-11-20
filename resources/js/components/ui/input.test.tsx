import { render, screen } from '@testing-library/react';

import { Input } from '@/components/ui/input';

describe('Input', () => {
    it('renders a 48 px field in the card colour', () => {
        render(<Input aria-label="Naam" defaultValue="Jans Bierkelder" />);

        const input = screen.getByRole('textbox', { name: 'Naam' });

        expect(input).toHaveValue('Jans Bierkelder');
        expect(input).toHaveClass('h-12', 'border-2', 'bg-card');
    });

    it('sets a value with a unit in mono with the unit after it', () => {
        render(<Input aria-label="Buitenmaat" unit="mm" defaultValue="508" />);

        const input = screen.getByRole('textbox', { name: 'Buitenmaat' });

        expect(input).toHaveClass('font-mono');
        expect(input.nextElementSibling).toHaveTextContent('mm');
        expect(input.nextElementSibling).toHaveAttribute('aria-hidden', 'true');
    });
});
