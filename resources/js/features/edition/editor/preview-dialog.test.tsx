import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { PreviewDialog } from './preview-dialog';

const open = (
    onJump = vi.fn(),
    onOpenChange = vi.fn(),
    parts: Record<string, boolean> = {},
) => {
    const edition = sampleEdition({
        parts: { money: true, pawns: true, boxLid: true, ...parts },
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
};

describe('PreviewDialog', () => {
    it('draws the board with the own currency, words and centre of the edition (bug 5 of ronde 3)', () => {
        const base = sampleEdition();
        const edition = {
            ...base,
            elements: {
                ...base.elements,
                'words.currency': { name: 'Kussen', text: 'Kx' },
                board_center: { subtitle: 'Ons eigen dorp' },
                theme_accent: { color: '#2255AA' },
            },
        };

        renderWithI18n(
            <PreviewDialog
                open
                onOpenChange={vi.fn()}
                edition={edition}
                resolved={resolveEdition(edition)}
                photos={new Map()}
                onJump={vi.fn()}
            />,
        );

        const stage = screen.getByTestId('preview-stage');
        expect(stage.textContent).toContain('Ons eigen dorp');
        expect(stage.textContent).toContain('Kx');
    });

    it('keeps title, zoom and close on one line, and fades the tabs where they scroll on (Gerda: R5-18)', () => {
        open();

        const title = screen.getByRole('heading', { name: 'Voorbeeld' });
        expect(title).toHaveClass('min-w-0', 'flex-1', 'truncate');
        expect(screen.getByRole('button', { name: 'Sluiten' })).toHaveClass(
            'shrink-0',
        );
        // "Passend" is an icon on a phone, so the three zoom buttons need 140 px.
        expect(screen.getByRole('button', { name: 'Passend' })).toHaveClass(
            'max-sm:w-11',
        );
        expect(screen.getByRole('tablist').className).toContain('mask-image');
    });

    it('keeps the icon in Passend and Sluiten between 400 and 640 px (R6 Aisha: empty squares at 412 px)', () => {
        open();

        // The button has 24 px padding from 400 px on; a 44 px icon button must win over it, or 0 px is left.
        for (const name of ['Passend', 'Sluiten']) {
            const button = screen.getByRole('button', { name });
            expect(button.className).toContain('min-[400px]:px-6');
            expect(button.className).toMatch(/max-(sm|lg):px-0!/);
        }
    });

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

    it('has tabs for the house rules and the invitation when they are on (bug 8 of B138, B204)', async () => {
        const user = userEvent.setup();
        const { onJump } = open(vi.fn(), vi.fn(), {
            houseRules: true,
            invitation: true,
        });

        expect(
            screen.getAllByRole('tab').map((tab) => tab.textContent),
        ).toEqual([
            'Bord',
            'Eigendomsbewijzen',
            'Kaarten',
            'Geld',
            'Pionnen',
            'Doosdeksel',
            'Huisregels',
            'Uitnodiging',
        ]);

        await user.click(screen.getByRole('tab', { name: 'Uitnodiging' }));
        await user.click(
            screen.getByRole('button', {
                name: 'Openen in de editor: invitation',
            }),
        );
        expect(onJump).toHaveBeenCalledWith('invitation');
    });

    it('leaves out the extra print that is off', () => {
        open(vi.fn(), vi.fn(), { invitation: true });

        expect(
            screen.getByRole('tab', { name: 'Uitnodiging' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('tab', { name: 'Spelregelboekje' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('tab', { name: 'Huisregels' }),
        ).not.toBeInTheDocument();
    });

    it('opens a space of the board in the editor on click', () => {
        const { onJump, onOpenChange } = open();

        fireEvent.click(
            document.querySelector('[data-position="3"]') ?? document.body,
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
