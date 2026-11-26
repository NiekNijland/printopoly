import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { sampleEdition } from '@/testing/editions';
import { mediaQueryList } from '@/testing/media-query';
import { renderWithI18n } from '@/testing/render';

import { BigBoard } from './big-board';

describe('BigBoard', () => {
    it('fits the window from a tablet up and only scrolls on a phone, where it says so (bug 16)', () => {
        renderWithI18n(
            <BigBoard
                open
                onOpenChange={() => undefined}
                edition={sampleEdition()}
                interfaceLanguage="nl"
                selected="space.01"
                warned={new Set()}
                onPick={() => undefined}
            />,
        );
        const size = document.querySelector('[data-big-board-size]');

        expect(size).toHaveClass('md:w-[min(100cqw,100cqh)]');
        expect(size?.className).not.toMatch(/(^| )md:w-\[max\(40rem/);
        expect(
            screen.getByText(
                'Het bord is groter dan je scherm: schuif om alles te zien.',
            ),
        ).toHaveClass('md:hidden');
    });

    it('shows the board as it prints, with a hit area over every space (feedback 22 nov)', async () => {
        const user = userEvent.setup();
        const onPick = vi.fn();
        renderWithI18n(
            <BigBoard
                open
                onOpenChange={() => undefined}
                edition={sampleEdition()}
                interfaceLanguage="nl"
                selected="space.01"
                warned={new Set()}
                onPick={onPick}
            />,
        );
        const render = document.querySelector('[data-big-board-render]');

        // The same renderer as the Voorbeeld and the PDF, with the real space names and prices.
        expect(render?.querySelector('[data-element="board"]')).not.toBeNull();
        expect(render?.querySelectorAll('[data-position]')).toHaveLength(40);
        expect(screen.getAllByRole('option')).toHaveLength(41);

        await user.click(screen.getByRole('option', { name: 'Molenweg' }));
        expect(onPick).toHaveBeenCalledWith('space.01');
    });

    it('names the arrow keys only to someone with a keyboard (Gerda: R5-18)', () => {
        const touch = vi
            .spyOn(window, 'matchMedia')
            .mockImplementation((query: string) =>
                mediaQueryList(query, query.includes('hover: none')),
            );
        renderWithI18n(
            <BigBoard
                open
                onOpenChange={() => undefined}
                edition={sampleEdition()}
                interfaceLanguage="nl"
                selected="space.01"
                warned={new Set()}
                onPick={() => undefined}
            />,
        );

        expect(
            screen.getByText(/Tik op een vak om het te openen\./),
        ).not.toHaveTextContent(/pijltjes|Enter/);
        touch.mockRestore();
    });
});
