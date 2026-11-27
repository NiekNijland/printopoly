import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import { openWorkspace } from '@/features/edition/testing/workspace';
import { sampleEdition } from '@/testing/editions';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace search and list', () => {
    it('spreads a list pasted in the search over the streets from the first one, in one undo step (R5-10)', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(
            screen.getByRole('searchbox', { name: 'Zoek een vak' }),
        );
        await user.paste('Kerkpad\r\nDorpsstraat\r\nMarkt\r\n');

        // Start keeps its name; the streets fill in order and the station between them is passed over.
        expect(session.edition.elements['space.00']).toBeUndefined();
        expect(session.edition.elements['space.01']?.name).toBe('Kerkpad');
        expect(session.edition.elements['space.03']?.name).toBe('Dorpsstraat');
        expect(session.edition.elements['space.06']?.name).toBe('Markt');
        // The search stays empty, so every row shows, and the flash says what happened.
        expect(
            screen.getByRole('searchbox', { name: 'Zoek een vak' }),
        ).toHaveValue('');
        expect(
            screen.getByText(
                '3 namen ingevuld. 2 vakken van een andere soort zijn overgeslagen.',
            ),
        ).toBeInTheDocument();

        session.undo();
        expect(session.edition.elements['space.01']).toBeUndefined();
        expect(session.edition.elements['space.06']).toBeUndefined();
    });

    it('searches for a paste of one line (R5-10)', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        const search = screen.getByRole('searchbox', { name: 'Zoek een vak' });
        await user.click(search);
        await user.paste('station');

        expect(search).toHaveValue('station');
        expect(session.edition.elements).toEqual(sampleEdition().elements);
    });

    it('shows parts that are not in the last set faded, with "niet in je set" (B198)', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace(
            {},
            {},
            {
                printSelection: {
                    set: 'home',
                    parts: ['board', 'deeds', 'cards', 'boxLid'],
                },
            },
        );

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(screen.getByRole('tab', { name: 'Doos' }));

        const lid = screen.getByRole('button', { name: /Doosdeksel/ });
        expect(lid).not.toHaveTextContent('niet in je set');
        const invitation = screen.getByRole('button', { name: /Uitnodiging/ });
        // The word sits next to the row, as a link to the print page (R6 Kees).
        expect(invitation.closest('li')).toHaveTextContent('niet in je set');
        // No dice, houses and hotels or rules booklet in the editor (B200, B204).
        expect(
            screen.queryByRole('button', { name: /Dobbelstenen/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Spelregelboekje/ }),
        ).not.toBeInTheDocument();

        // A faded part still opens and can be made.
        await user.click(invitation);
        expect(
            screen.getByRole('heading', { name: 'Uitnodiging' }),
        ).toBeInTheDocument();
    });

    it('shows the set the print page opens with before it saved a choice (R5-20, B225)', async () => {
        const user = userEvent.setup();
        const { session } = await openWorkspace();

        renderWithI18n(<EditorWorkspace session={session} />);
        await user.click(screen.getByRole('tab', { name: 'Geld' }));

        expect(screen.getAllByText('niet in je set').length).toBeGreaterThan(0);
    });
});
