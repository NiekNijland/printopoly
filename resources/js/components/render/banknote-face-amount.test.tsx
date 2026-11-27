import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NoteAmount, NoteFramedAmount } from './banknote-face-amount';

const props = {
    ink: '#112233',
    light: '#FFFFEE',
    amount: '€ 50',
    bank: 'Vijftig',
    bankSlot: 'value-words',
};

describe('the amount of a theme note', () => {
    it('writes the amount and the bank in the oval', () => {
        const { container } = render(<NoteAmount {...props} />);

        expect(
            container.querySelector('[data-slot="value"]')?.textContent,
        ).toBe('€ 50');
        expect(
            container.querySelector('[data-slot="value-words"]')?.textContent,
        ).toBe('Vijftig');
        expect(container.querySelectorAll('[data-slot]')).toHaveLength(2);
    });

    it('puts the amount on a plate and the bank under the oval when a photo fills it', () => {
        const { container } = render(<NoteFramedAmount {...props} />);

        expect(
            container.querySelector('[data-slot="value"]')?.textContent,
        ).toBe('€ 50');
        expect(
            container.querySelector('[data-slot="value-words"]')?.textContent,
        ).toBe('Vijftig');
        expect(container.innerHTML).toContain('0.35mm solid #112233');
    });
});
