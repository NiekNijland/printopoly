import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
    NativeSelect,
    NativeSelectOption,
} from '@/components/ui/native-select';

const Currency = (props: { disabled?: boolean }) => (
    <NativeSelect
        aria-label="Currency"
        defaultValue="eur"
        className="font-mono"
        wrapperClassName="w-40"
        {...props}
    >
        <NativeSelectOption value="eur">Euro</NativeSelectOption>
        <NativeSelectOption value="usd">Dollar</NativeSelectOption>
    </NativeSelect>
);

describe('NativeSelect', () => {
    it('is a real select whose choice changes', async () => {
        const user = userEvent.setup();
        render(<Currency />);
        const select = screen.getByRole('combobox', { name: 'Currency' });

        expect(select.tagName).toBe('SELECT');
        expect(select).toHaveValue('eur');

        await user.selectOptions(select, 'Dollar');

        expect(select).toHaveValue('usd');
        expect(screen.getByRole('option', { name: 'Dollar' })).toHaveAttribute(
            'data-slot',
            'native-select-option',
        );
    });

    it('sizes the wrapper and the select apart and draws the chevron', () => {
        render(<Currency />);
        const select = screen.getByRole('combobox');
        const wrapper = select.parentElement;

        expect(select).toHaveClass('h-12', 'border-2', 'font-mono');
        expect(wrapper).toHaveAttribute('data-slot', 'native-select-wrapper');
        expect(wrapper).toHaveClass('w-40');
        expect(
            wrapper?.querySelector('[data-slot="native-select-icon"]'),
        ).toHaveAttribute('aria-hidden', 'true');
    });

    it('can be disabled', () => {
        render(<Currency disabled />);

        expect(screen.getByRole('combobox')).toBeDisabled();
    });
});
