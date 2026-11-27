import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import { openWorkspace } from '@/features/edition/testing/workspace';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

beforeEach(() => {
    setPage(fakePage({ auth: { googleLoginEnabled: true } }));
});

describe('EditorWorkspace', () => {
    describe('Uiterlijk (B130, B145)', () => {
        const openLook = async () => {
            const user = userEvent.setup();
            const { session } = await openWorkspace();

            renderWithI18n(<EditorWorkspace session={session} />);
            await user.click(
                screen.getByRole('button', { name: /^Overzicht:/ }),
            );

            return { user, session };
        };

        it('lets a group colour be picked from the palette of the theme, without an accent (B203)', async () => {
            const { user, session } = await openLook();

            expect(
                screen.queryByRole('button', { name: /Pijlen.*Doosdeksel/ }),
            ).not.toBeInTheDocument();
            await user.click(
                screen.getByRole('button', { name: 'Kleur van Rood' }),
            );
            const red = screen.getByRole('group', { name: 'Rood' });
            await user.click(
                within(red).getByRole('button', { name: 'Oranje' }),
            );
            expect(session.edition.elements['group.red']?.color).toBe(
                '#F7941D',
            );
        });

        it('lets a card back take a pattern', async () => {
            const user = userEvent.setup();
            const { session } = await openWorkspace();

            renderWithI18n(<EditorWorkspace session={session} />);
            await user.click(screen.getByRole('tab', { name: /Kaarten/ }));
            await user.click(
                screen.getByRole('button', { name: /Kans: achterkant/ }),
            );
            await user.click(screen.getByRole('radio', { name: 'Patroon' }));
            await user.click(screen.getByRole('radio', { name: 'Golven' }));

            expect(session.edition.elements['card_back.chance']?.pattern).toBe(
                'waves',
            );
        });
    });
});
