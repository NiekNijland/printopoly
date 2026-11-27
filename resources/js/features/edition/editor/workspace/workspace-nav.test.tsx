import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import { openWorkspace } from '@/features/edition/testing/workspace';
import { setPage } from '@/testing/inertia';
import { mediaQueryList } from '@/testing/media-query';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace navigation column', () => {
    it('always has all four tabs, without counts (B198, waarde-review point 10)', async () => {
        const { session } = await openWorkspace(
            {},
            {
                'space.01': { name: 'Molenweg' },
                'space.03': { name: 'Kerkstraat' },
            },
        );

        renderWithI18n(<EditorWorkspace session={session} />);
        const tabs = within(
            screen.getByRole('tablist', { name: 'Onderdeel' }),
        ).getAllByRole('tab');

        expect(tabs.map((tab) => tab.textContent)).toEqual([
            'Bord',
            'Kaarten',
            'Geld',
            'Doos',
        ]);
    });

    it('puts Editie as its stamp beside the tabs on a low screen, so the list keeps the height (designcheck ronde 5, B215)', async () => {
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        const row = screen.getByRole('button', {
            name: /^Overzicht: naam, thema, woorden, bordmaat/,
        });
        // The name stays for the ear and for a mouse; the visible words go on a low screen.
        expect(row).toHaveAttribute('title', 'Overzicht');
        expect(row).toHaveClass('low:size-12');
        expect(within(row).getByText('Overzicht').parentElement).toHaveClass(
            'low:hidden',
        );
        const head = row.closest<HTMLElement>('[data-nav-head]');
        if (head === null) {
            throw new Error('No nav head');
        }
        expect(head).toHaveClass('low:flex-row');
        expect(within(head).getByRole('tablist')).toBeInTheDocument();
    });

    it('folds the small board to one line on a screen lower than 900 px (vindbaarheid point 16)', async () => {
        const user = userEvent.setup();
        const media = vi
            .spyOn(window, 'matchMedia')
            .mockImplementation((query: string) =>
                mediaQueryList(
                    query,
                    query.includes('min-width: 768px') ||
                        query.includes('max-height: 899.98px'),
                ),
            );
        const { session } = await openWorkspace();

        const { container } = renderWithI18n(
            <EditorWorkspace session={session} />,
        );
        const fold = screen.getByRole('button', { name: 'Bord tonen' });
        expect(fold).toHaveAttribute('aria-expanded', 'false');
        expect(
            container.querySelector('[data-mini-board]')?.parentElement,
        ).toHaveClass('md:hidden');

        await user.click(fold);
        expect(
            screen.getByRole('button', { name: 'Bord inklappen' }),
        ).toHaveAttribute('aria-expanded', 'true');
        media.mockRestore();
    });
});
