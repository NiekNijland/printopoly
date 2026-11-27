import { screen } from '@testing-library/react';

import { renderWithI18n } from '@/testing/render';

import { AmountHint } from './amount-scale';

const format = (amount: number) => `€ ${String(amount)}`;

const hintOf = (props: {
    min?: number;
    max?: number;
    standard: number | undefined;
    value: number;
    invalid?: boolean;
}): string | null => {
    const { container } = renderWithI18n(
        <AmountHint
            id="price"
            min={props.min ?? 48}
            max={props.max ?? 72}
            standard={props.standard}
            value={props.value}
            format={format}
            invalid={props.invalid ?? false}
        />,
    );

    return container.querySelector('#price-hint')?.textContent ?? null;
};

describe('AmountHint', () => {
    it('shows the room as a scale with the standard and how far the amount is from it', () => {
        const { container } = renderWithI18n(
            <AmountHint
                id="price"
                min={48}
                max={72}
                standard={60}
                value={66}
                format={format}
                invalid={false}
            />,
        );

        expect(screen.getByText('€ 48')).toBeInTheDocument();
        expect(screen.getByText('€ 72')).toBeInTheDocument();
        expect(container.querySelector('#price-hint')).toHaveTextContent(
            '€ 6 hoger dan standaard (€ 60). Kies 48 tot 72.',
        );
        expect(container.querySelector('.bg-press')).toHaveStyle({
            left: '75%',
        });
    });

    it('says the amount is the standard, below it, or only the room without a standard', () => {
        expect(hintOf({ standard: 60, value: 60 })).toBe(
            'Standaard bedrag. Kies 48 tot 72.',
        );
        expect(hintOf({ standard: 60, value: 50 })).toBe(
            '€ 10 lager dan standaard (€ 60). Kies 48 tot 72.',
        );
        expect(
            hintOf({ min: 10, max: 500, standard: undefined, value: 50 }),
        ).toBe('Kies 10 tot 500. Kies 10 tot 500.');
    });

    it('names the limits of an invalid amount and says when an amount cannot change', () => {
        expect(hintOf({ standard: 60, value: 60, invalid: true })).toBe(
            'Kies een bedrag tussen 48 en 72.',
        );
        expect(
            screen.getByText('Kies een bedrag tussen 48 en 72.'),
        ).toHaveClass('text-press');
        expect(hintOf({ min: 2, max: 2, standard: 2, value: 2 })).toBe(
            'Dit bedrag is te klein om aan te passen: 20% ervan is minder dan 1.',
        );
    });
});
