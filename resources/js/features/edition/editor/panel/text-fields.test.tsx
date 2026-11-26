import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('TextFields', () => {
    it('fills this pawn and the next ones from a paste of several lines, as one undo step', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('pawn.02');

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getByText(
                'Plak een lijst met namen om ook de volgende pionnen te benoemen.',
            ),
        ).toBeInTheDocument();
        const name = screen.getByRole('textbox', { name: 'Naam' });
        await user.click(name);
        await user.paste('Anna\r\nBram\n\nCas');

        expect(session.edition.elements['pawn.01']).toBeUndefined();
        expect(session.edition.elements['pawn.02']?.name).toBe('Anna');
        expect(session.edition.elements['pawn.03']?.name).toBe('Bram');
        expect(session.edition.elements['pawn.04']?.name).toBe('Cas');
        expect(screen.getByText('3 namen ingevuld.')).toHaveAttribute(
            'role',
            'status',
        );

        session.undo();
        expect(session.edition.elements['pawn.02']).toBeUndefined();
        expect(session.edition.elements['pawn.04']).toBeUndefined();
    });

    it('keeps a paste of one line as ordinary typing', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('pawn.01');

        renderWithI18n(<ElementPanel {...props} />);
        const name = screen.getByRole('textbox', { name: 'Naam' });
        await user.clear(name);
        await user.paste('Opa Heinz');

        expect(session.edition.elements['pawn.01']?.name).toBe('Opa Heinz');
        expect(session.edition.elements['pawn.02']).toBeUndefined();
    });
});
