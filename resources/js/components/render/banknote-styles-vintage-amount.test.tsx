import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    VintageAmount,
    VintageFramedAmount,
} from './banknote-styles-vintage-amount';

const props = {
    ink: '#112233',
    light: '#FFFFEE',
    amount: '€ 500',
    bank: 'De bank',
    bankSlot: 'bank-name',
};

describe('the amount of a Vintage note', () => {
    it('writes the amount and the bank in the oval', () => {
        const { container } = render(<VintageAmount {...props} />);

        expect(
            container.querySelector('[data-slot="value"]')?.textContent,
        ).toBe('€ 500');
        expect(
            container.querySelector('[data-slot="bank-name"]')?.textContent,
        ).toBe('De bank');
        expect(container.querySelector('[data-slot="value-plate"]')).toBeNull();
    });

    it('puts both on plates round a framed photo', () => {
        const { container } = render(<VintageFramedAmount {...props} />);

        expect(
            container.querySelectorAll('[data-slot="value-plate"] path'),
        ).toHaveLength(2);
        expect(
            container.querySelector('[data-slot="value"]')?.textContent,
        ).toBe('€ 500');
        expect(
            container.querySelector('[data-slot="bank-name"]')?.textContent,
        ).toBe('De bank');
    });
});
