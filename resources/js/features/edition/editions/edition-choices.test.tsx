import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
    CurrencyChoice,
    ThemeChoice,
} from '@/features/edition/editions/edition-choices';
import { renderWithI18n } from '@/testing/render';

const noop = () => undefined;

describe('edition choices', () => {
    it('draws the theme previews in the language of the edition', () => {
        const { container } = renderWithI18n(
            <ThemeChoice
                theme="classic"
                name="Our edition"
                language="en"
                currency="eur"
                interfaceLanguage="en"
                idPrefix="edition"
                onTheme={noop}
            />,
            'en',
        );

        expect(container.textContent).not.toContain('Molenweg');
    });

    it('offers the themes and the currencies as radio cards (shadcn RadioGroup, B195)', async () => {
        const user = userEvent.setup();
        const onTheme = vi.fn();
        const onCurrency = vi.fn();
        renderWithI18n(
            <>
                <ThemeChoice
                    theme="classic"
                    name="Ons dorp"
                    language="nl"
                    currency="eur"
                    interfaceLanguage="nl"
                    idPrefix="new"
                    onTheme={onTheme}
                />
                <CurrencyChoice
                    currency="eur"
                    language="nl"
                    idPrefix="new"
                    onCurrency={onCurrency}
                />
            </>,
        );

        expect(screen.getByRole('radio', { name: 'Klassiek' })).toBeChecked();
        expect(screen.getByRole('radio', { name: '€ euro' })).toBeChecked();
        await user.click(screen.getByText('Riso'));
        await user.click(screen.getByRole('radio', { name: '£ pond' }));

        expect(onTheme).toHaveBeenCalledWith('riso');
        expect(onCurrency).toHaveBeenCalledWith('gbp');
    });
});
