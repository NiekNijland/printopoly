import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import {
    BoardChoice,
    CurrencyChoice,
    ThemeChoice,
} from '@/features/edition/editions/edition-choices';
import {
    DEFAULT_BOARD_PROFILE,
    type BoardProfile,
} from '@/lib/render/print-board';
import { renderWithI18n } from '@/testing/render';

const noop = () => undefined;

describe('edition choices', () => {
    it('names the standard board in the interface language', () => {
        renderWithI18n(
            <BoardChoice
                profile={DEFAULT_BOARD_PROFILE}
                interfaceLanguage="en"
                idPrefix="edition"
                onProfile={noop}
            />,
            'en',
        );

        expect(screen.getByText('Modern square')).toBeInTheDocument();
        expect(screen.queryByText('Modern vierkant')).not.toBeInTheDocument();
    });

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

    it('expands the board size fields for "Andere maat" and rejects sizes that do not fit', async () => {
        const user = userEvent.setup();
        const Harness = () => {
            const [profile, setProfile] = useState<BoardProfile>(
                DEFAULT_BOARD_PROFILE,
            );

            return (
                <BoardChoice
                    profile={profile}
                    interfaceLanguage="nl"
                    idPrefix="edition"
                    onProfile={setProfile}
                />
            );
        };
        renderWithI18n(<Harness />);
        expect(
            screen.queryByLabelText(/A: buitenmaat/),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: /Andere maat/ }));
        const outer = screen.getByLabelText(/A: buitenmaat/);
        await user.clear(outer);
        await user.type(outer, '100');

        const alert = await screen.findByRole('alert');
        // Only the field that was changed turns red (Lukas, R5-19).
        expect(outer).toHaveAttribute('aria-invalid', 'true');
        expect(outer).toHaveAttribute('aria-describedby', alert.id);
        for (const field of [
            screen.getByLabelText(/B: /),
            screen.getByLabelText(/C: /),
        ]) {
            expect(field).toHaveAttribute('aria-invalid', 'false');
            expect(field).not.toHaveAttribute('aria-describedby');
        }
    });
});
