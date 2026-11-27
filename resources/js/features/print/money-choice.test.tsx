import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { MoneyAmount } from '@/lib/render/print-money';
import { renderWithI18n } from '@/testing/render';

import { MoneyChoice } from './money-choice';

type Change = (amount: MoneyAmount | null) => void;

describe('MoneyChoice', () => {
    it('offers the three amounts with the chosen one selected', () => {
        renderWithI18n(
            <MoneyChoice value="eight" onChange={vi.fn<Change>()} />,
        );

        expect(
            screen.getByRole('radiogroup', { name: 'Hoeveel geld?' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('radio')).toHaveLength(3);
        expect(
            screen.getByRole('radio', { name: '5 tot 8 spelers' }),
        ).toBeChecked();
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('starts with the default of each set, chosen while nothing is chosen', () => {
        renderWithI18n(
            <MoneyChoice
                value={null}
                onChange={vi.fn<Change>()}
                perSet="Aanbevolen"
                aside={<span>Opnieuw</span>}
                note="Aanbevolen voor de Thuisprint-set: 2 tot 4 spelers."
            />,
        );

        expect(screen.getAllByRole('radio')).toHaveLength(4);
        expect(screen.getByRole('radio', { name: 'Aanbevolen' })).toBeChecked();
        expect(screen.getByText('Opnieuw')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Aanbevolen voor de Thuisprint-set: 2 tot 4 spelers.',
            ),
        ).toBeInTheDocument();
    });

    it('passes on a choice, the default as null, and keeps the chosen one on a second click', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn<Change>();
        renderWithI18n(
            <MoneyChoice
                value="four"
                onChange={onChange}
                perSet="Aanbevolen"
            />,
        );

        await user.click(screen.getByRole('radio', { name: 'Volledige bank' }));
        await user.click(screen.getByRole('radio', { name: 'Aanbevolen' }));
        await user.click(
            screen.getByRole('radio', { name: '2 tot 4 spelers' }),
        );

        expect(onChange.mock.calls).toEqual([['full'], [null]]);
    });

    it('makes a warning stand out', () => {
        renderWithI18n(
            <MoneyChoice
                value="four"
                onChange={vi.fn<Change>()}
                note="Te weinig geld."
                warn
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent('Te weinig geld.');
    });

    it('can be switched off', () => {
        renderWithI18n(
            <MoneyChoice value="four" onChange={vi.fn<Change>()} disabled />,
        );

        expect(
            screen.getByRole('radio', { name: 'Volledige bank' }),
        ).toBeDisabled();
    });
});
