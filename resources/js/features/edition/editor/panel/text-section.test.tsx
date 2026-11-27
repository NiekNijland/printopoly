import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('TextSection', () => {
    it('writes a typed name into the edition and back to standard clears it', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        const name = screen.getByLabelText('Naam');
        await user.clear(name);
        await user.type(name, 'Jans Bierkelder');

        expect(session.edition.elements['space.01']?.name).toBe(
            'Jans Bierkelder',
        );
    });

    it('keeps an emptied street name empty, with the standard name in grey (R6 Aisha, Sara; B258)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');

        const first = renderWithI18n(<ElementPanel {...props} />);
        await user.clear(screen.getByLabelText('Naam'));
        await user.tab();
        expect(session.edition.elements['space.01']?.name).toBe('');

        first.unmount();
        renderWithI18n(
            <ElementPanel
                {...props}
                edition={session.edition}
                resolved={resolveEdition(session.edition)}
            />,
        );
        const name = screen.getByLabelText('Naam');
        expect(name).toHaveValue('');
        expect(name).toHaveAttribute('placeholder', 'Molenweg');
    });

    it('goes to the words of the edition with a real button, not a link in the sentence (designcheck ronde 5)', async () => {
        const { props } = await setup('note.100');
        const onOpenWords = vi.fn();

        renderWithI18n(<ElementPanel {...props} onOpenWords={onOpenWords} />);
        const button = screen.getByRole('button', { name: 'Naar de woorden' });
        // The house button (48 px high), outside the paragraph that explains where the bank name lives.
        expect(button).toHaveAttribute('data-slot', 'button');
        expect(button).toHaveClass('h-12');
        expect(button.closest('p')).toBeNull();
        fireEvent.click(button);
        expect(onOpenWords).toHaveBeenCalledTimes(1);
    });

    it('edits the house rules as text', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('house_rules');

        renderWithI18n(<ElementPanel {...props} />);
        await user.type(screen.getByLabelText('Regels'), 'Geen handel');

        expect(session.edition.elements['house_rules']?.text).toBe(
            'Geen handel',
        );
    });

    it('writes the town of the colour group of a street, once for the whole group', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        await user.type(screen.getByLabelText('Plaats'), 'Zwolle');

        expect(session.edition.elements['group.brown']?.town).toBe('Zwolle');
        expect(session.edition.elements['space.01']).toBeUndefined();

        await user.clear(screen.getByLabelText('Plaats'));

        expect(session.edition.elements['group.brown']?.town).toBeUndefined();
    });

    it('has no town field on a space that is not a street', async () => {
        const { props } = await setup('space.05');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.queryByLabelText('Plaats')).not.toBeInTheDocument();
    });

    it('has a story field for a title deed (B169)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('deed.01');

        renderWithI18n(<ElementPanel {...props} />);
        await user.type(
            screen.getByRole('textbox', { name: /Verhaal/ }),
            'Hier woonde opa',
        );

        expect(session.edition.elements['deed.01']?.text).toBe(
            'Hier woonde opa',
        );
    });

    it('gives a corner a short text with the standard line as placeholder, and a street none', async () => {
        const user = userEvent.setup();
        const start = await setup('space.00');

        renderWithI18n(<ElementPanel {...start.props} />);
        const field = screen.getByLabelText(/Korte tekst/);
        expect(field).toHaveAttribute(
            'placeholder',
            'Ontvang €\u00A0200 als je langs Start komt',
        );
        await user.type(field, 'Pak je salaris');
        expect(start.session.edition.elements['space.00']?.text).toBe(
            'Pak je salaris',
        );
        await user.clear(field);
        expect(start.session.edition.elements['space.00']).toBeUndefined();
    });

    it('does not offer a short text on a street or a card space', async () => {
        const street = await setup('space.01');

        renderWithI18n(<ElementPanel {...street.props} />);

        expect(screen.queryByLabelText(/Korte tekst/)).toBeNull();
        expect(screen.queryByLabelText('Verhaal')).toBeNull();
    });

    it('folds the standard text of a card under the story, with one Standaard button', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chance.01', {
            elements: { 'card.chance.01': { text: 'Eigen verhaal' } },
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getAllByRole('button', { name: /terug naar standaard/ }),
        ).toHaveLength(1);
        await user.click(screen.getByText('Standaardtekst'));
        expect(screen.getByText(/Wat er gebeurt/)).toBeVisible();

        await user.click(
            screen.getByRole('button', {
                name: 'Tekst van de kaart terug naar standaard',
            }),
        );
        expect(session.edition.elements['card.chance.01']).toBeUndefined();
    });

    it('has no Verhaal field on a corner, only a short text (bug 9)', async () => {
        const { props } = await setup('space.00');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getByLabelText('Korte tekst')).toBeInTheDocument();
        expect(screen.queryByText('Verhaal')).toBeNull();
    });
});
