import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { installMemoryServices } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import EditionsIndex from './index';

const seed = async (names: string[]) => {
    const services = installMemoryServices();
    for (const name of names) {
        await services.repository.create({
            name,
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        });
    }

    return services;
};
describe('Mijn edities flow', () => {
    it('selects the name when the rename dialog opens', async () => {
        const user = userEvent.setup();
        await seed(['Zaterdagclub']);
        renderWithI18n(<EditionsIndex />);

        await user.click(
            await screen.findByRole('button', {
                name: 'Meer opties voor Zaterdagclub',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Naam wijzigen' }),
        );

        const field = await screen.findByLabelText<HTMLInputElement>('Naam');
        await waitFor(() => expect(field).toHaveFocus());
        expect(field.selectionEnd).toBe('Zaterdagclub'.length);
    });

    it('says a copy was made', async () => {
        const user = userEvent.setup();
        await seed(['Zaterdagclub']);
        renderWithI18n(<EditionsIndex />);

        await user.click(
            await screen.findByRole('button', {
                name: 'Dupliceer Zaterdagclub als nieuwe editie',
            }),
        );

        expect(
            await screen.findByText('Zaterdagclub (kopie) is gemaakt.'),
        ).toBeInTheDocument();
    });

    it('moves the focus to the next card after a delete', async () => {
        const user = userEvent.setup();
        await seed(['Eerste', 'Tweede']);
        renderWithI18n(<EditionsIndex />);

        await user.click(
            await screen.findByRole('button', {
                name: 'Meer opties voor Tweede',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Verwijderen' }),
        );
        await user.click(
            await screen.findByRole('button', { name: 'Verwijderen' }),
        );

        expect(await screen.findByText('Editie verwijderd.')).toBeVisible();
        await waitFor(() =>
            expect(document.activeElement).toHaveAttribute('data-edition-link'),
        );
    });
});
