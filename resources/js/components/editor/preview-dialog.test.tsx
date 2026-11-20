import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { resolveEdition } from '@/lib/edition/resolve';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { PreviewDialog } from './preview-dialog';

function open(onJump = vi.fn(), onOpenChange = vi.fn()) {
    const edition = sampleEdition({
        parts: { money: true, pawns: true, boxLid: true },
    });

    renderWithI18n(
        <PreviewDialog
            open
            onOpenChange={onOpenChange}
            edition={edition}
            resolved={resolveEdition(edition)}
            photos={new Map()}
            onJump={onJump}
        />,
    );

    return { onJump, onOpenChange };
}

describe('PreviewDialog', () => {
    it('shows the whole board and a tab for every part that is on', () => {
        open();

        expect(screen.getByRole('dialog', { name: 'Voorbeeld' })).toBeVisible();
        expect(
            screen.getAllByRole('tab').map((tab) => tab.textContent),
        ).toEqual([
            'Bord',
            'Eigendomsbewijzen',
            'Kaarten',
            'Geld',
            'Pionnen',
            'Doosdeksel',
        ]);
        expect(
            document.querySelectorAll('[data-position]').length,
        ).toBeGreaterThanOrEqual(40);
    });

    it('opens a space of the board in the editor on click', () => {
        const { onJump, onOpenChange } = open();

        fireEvent.click(
            document.querySelector('[data-position="3"]') as HTMLElement,
        );

        expect(onJump).toHaveBeenCalledWith('space.03');
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('lists the cards of a tab as items that open in the editor', async () => {
        const user = userEvent.setup();
        const { onJump } = open();

        await user.click(screen.getByRole('tab', { name: 'Kaarten' }));
        await user.click(
            screen.getByRole('button', {
                name: 'Openen in de editor: card.chance.02',
            }),
        );

        expect(onJump).toHaveBeenCalledWith('card.chance.02');
    });

    it('closes on Escape', async () => {
        const user = userEvent.setup();
        const { onOpenChange } = open();

        await user.keyboard('{Escape}');

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
