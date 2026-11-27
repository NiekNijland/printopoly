import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const Currencies = ({
    onValueChange,
}: {
    onValueChange?: (value: string) => void;
}) => (
    <RadioGroup
        aria-label="Valuta"
        defaultValue="eur"
        onValueChange={onValueChange}
        className="mine"
    >
        <RadioGroupItem value="eur" aria-label="Euro" />
        <RadioGroupItem value="m" aria-label="Monopoly-geld" />
        <RadioGroupItem value="x" aria-label="Uit" disabled />
    </RadioGroup>
);

describe('RadioGroup', () => {
    it('is a radio group with the default value chosen', () => {
        render(<Currencies />);

        expect(screen.getByRole('radiogroup', { name: 'Valuta' })).toHaveClass(
            'grid',
            'mine',
        );
        expect(screen.getByRole('radio', { name: 'Euro' })).toBeChecked();
        expect(
            screen.getByRole('radio', { name: 'Monopoly-geld' }),
        ).not.toBeChecked();
    });

    it('chooses another item with a click and tells its caller', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn<(value: string) => void>();
        render(<Currencies onValueChange={onValueChange} />);

        await user.click(screen.getByRole('radio', { name: 'Monopoly-geld' }));

        expect(
            screen.getByRole('radio', { name: 'Monopoly-geld' }),
        ).toBeChecked();
        expect(screen.getByRole('radio', { name: 'Euro' })).not.toBeChecked();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith('m');
    });

    it('shows the indicator only in the chosen item', () => {
        render(<Currencies />);

        expect(
            screen
                .getByRole('radio', { name: 'Euro' })
                .querySelector('[data-slot="radio-group-indicator"]'),
        ).not.toBeNull();
        expect(
            screen
                .getByRole('radio', { name: 'Monopoly-geld' })
                .querySelector('[data-slot="radio-group-indicator"]'),
        ).toBeNull();
    });

    it('ignores a disabled item', async () => {
        const user = userEvent.setup();
        render(<Currencies />);

        await user.click(screen.getByRole('radio', { name: 'Uit' }));

        expect(screen.getByRole('radio', { name: 'Uit' })).toBeDisabled();
        expect(screen.getByRole('radio', { name: 'Euro' })).toBeChecked();
    });
});
