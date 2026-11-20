import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Select } from '@/components/ui/select';

describe('Select', () => {
    it('is a native select so phones show their own picker', async () => {
        render(
            <Select aria-label="Valuta" defaultValue="eur">
                <option value="eur">€</option>
                <option value="m">M</option>
            </Select>,
        );

        const select = screen.getByRole('combobox', { name: 'Valuta' });
        await userEvent.selectOptions(select, 'm');

        expect(select.tagName).toBe('SELECT');
        expect(select).toHaveValue('m');
        expect(select).toHaveClass('h-12');
    });
});
