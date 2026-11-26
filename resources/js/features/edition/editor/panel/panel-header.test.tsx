import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
    menuButton,
    setup,
} from '@/features/edition/editor/testing/element-panel-setup';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('PanelHeader', () => {
    it('goes back to standard by dropping every override of the element', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', { named: true });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(menuButton('Meer voor Molenweg'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Terug naar standaard' }),
        );

        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('takes a pawn out of the set and tells the editor', async () => {
        const user = userEvent.setup();
        const onRemoved = vi.fn();
        const { props, session } = await setup('pawn.03');

        renderWithI18n(<ElementPanel {...props} onRemoved={onRemoved} />);
        await user.click(menuButton('Meer voor Molenweg'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Pion weghalen' }),
        );

        expect(session.edition.elements['pawn.03']?.hidden).toBe(true);
        expect(onRemoved).toHaveBeenCalled();
    });

    // Bug 33 (ronde 3): the menu lay over the title, and at 1024 px over the switch Vak / Eigendomsbewijs above the
    // panel. As shadcn's DropdownMenu it always opens downwards, under its button, and never flips up (B179).
    // Vindbaarheid point 15: what you came to do first, Terug naar standaard last.
    it('opens the element menu under its button with the actions first, and closes it with Escape', async () => {
        const user = userEvent.setup();
        const { props } = await setup('pawn.03', {
            elements: { 'pawn.03': { name: 'Oma' } },
        });

        renderWithI18n(<ElementPanel {...props} />);
        const button = menuButton('Meer voor Molenweg');
        expect(button).toHaveAttribute('aria-expanded', 'false');
        await user.click(button);
        const menu = await screen.findByRole('menu', {
            name: 'Meer voor Molenweg',
        });

        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(menu).toHaveAttribute('data-side', 'bottom');
        expect(
            within(menu)
                .getAllByRole('menuitem')
                .map((item) => item.textContent),
        ).toEqual(['Pion weghalen', 'Terug naar standaard']);
        expect(within(menu).getByRole('separator')).toBeInTheDocument();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(button).toHaveFocus();
    });

    it('asks before going back to standard when a photo goes with it', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', {
            withPhoto: true,
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(menuButton('Meer voor Molenweg'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Terug naar standaard' }),
        );
        const dialog = await screen.findByRole('dialog', {
            name: 'Terug naar standaard?',
        });
        expect(session.edition.elements['space.01']?.photo).toBeDefined();

        await user.click(
            within(dialog).getByRole('button', {
                name: 'Terug naar standaard',
            }),
        );
        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('clears the names on the board from the menu of a street, in one undo step, and keeps your own (B201, B258)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', { named: true });
        const before = structuredClone(session.edition.elements);

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(menuButton('Meer voor Molenweg'));
        await user.click(
            screen.getByRole('menuitem', {
                name: 'Alle namen op het bord leegmaken',
            }),
        );

        // The name typed on Molenweg stays (R6 Sara); the standard names go.
        expect(session.edition.elements['space.01']?.name).toBe(
            'Jans Bierkelder',
        );
        expect(session.edition.elements['space.03']?.name).toBe('');
        expect(session.edition.elements['space.05']?.name).toBe('');
        expect(session.edition.elements['space.00']).toBeUndefined();
        expect(
            screen.getByText(/1 naam die je zelf typte, bleef staan/),
        ).toBeInTheDocument();

        session.undo();
        expect(session.edition.elements).toEqual(before);
    });

    it('gives an extra card a free amount and takes it out from the menu (B135)', async () => {
        const user = userEvent.setup();
        const onRemoved = vi.fn();
        const { props, session } = await setup('card.chest.17', {
            elements: {
                'card.chest.17': { added: true, text: 'Een' },
                'card.chest.18': { added: true, text: 'Twee' },
            },
        });

        renderWithI18n(
            <ElementPanel
                {...props}
                title="Algemeen Fonds 17"
                onRemoved={onRemoved}
            />,
        );
        expect(screen.getByText(/Extra kaart/)).toBeInTheDocument();
        expect(screen.queryByText('Standaardtekst')).toBeNull();

        await user.click(screen.getByRole('radio', { name: 'Ontvangen' }));
        expect(session.edition.elements['card.chest.17']?.amount).toBe(50);

        await user.click(menuButton('Meer voor Algemeen Fonds 17'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Kaart weghalen' }),
        );

        expect(session.edition.elements['card.chest.17']).toEqual({
            added: true,
            text: 'Twee',
        });
        expect(session.edition.elements['card.chest.18']).toBeUndefined();
        expect(onRemoved).toHaveBeenCalled();
    });
});
