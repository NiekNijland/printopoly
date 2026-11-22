import { screen } from '@testing-library/react';

import { sampleEdition } from '@/testing/editions';
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

    it('names the arrow keys only to someone with a keyboard (Gerda: R5-18)', () => {
        const touch = vi.spyOn(window, 'matchMedia').mockImplementation(
            (query: string) =>
                ({
                    matches: query.includes('hover: none'),
                    media: query,
                    addEventListener: () => undefined,
                    removeEventListener: () => undefined,
                }) as unknown as MediaQueryList,
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
