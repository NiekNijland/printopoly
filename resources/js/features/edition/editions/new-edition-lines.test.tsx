import { fireEvent, screen } from '@testing-library/react';

import { renderWithI18n } from '@/testing/render';

import { LanguageLine, ThemeAndCurrency } from './new-edition-lines';

describe('the lines of a new edition', () => {
    it('switches the language, and keeps one chosen', () => {
        const onLanguage = vi.fn();
        renderWithI18n(<LanguageLine language="nl" onLanguage={onLanguage} />);

        fireEvent.click(screen.getByRole('radio', { name: 'English' }));
        expect(onLanguage).toHaveBeenCalledWith('en');
        expect(screen.getByRole('radio', { name: 'Nederlands' })).toBeChecked();
    });

    it('folds the theme and the currency into one line each, and opens one at a time (B154)', () => {
        const onTheme = vi.fn();
        renderWithI18n(
            <ThemeAndCurrency
                values={{ theme: 'classic', language: 'nl' }}
                currency="eur"
                remembered={false}
                shownName="Onze editie"
                onTheme={onTheme}
                onCurrency={vi.fn()}
            />,
        );

        const theme = screen.getByRole('button', { name: /Thema/ });
        expect(theme).toHaveTextContent('Klassiek');
        expect(screen.getByRole('button', { name: /Munt/ })).toHaveTextContent(
            '€ euro',
        );
        fireEvent.click(theme);
        expect(theme).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(screen.getByRole('radio', { name: /Riso/ }));
        expect(onTheme).toHaveBeenCalledWith('riso');
    });

    it('says when the currency is the one picked last time (R5-22)', () => {
        renderWithI18n(
            <ThemeAndCurrency
                values={{ theme: 'classic', language: 'en' }}
                currency="gbp"
                remembered
                shownName="Our edition"
                onTheme={vi.fn()}
                onCurrency={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: /Munt/ })).toHaveTextContent(
            /pond/,
        );
    });
});
