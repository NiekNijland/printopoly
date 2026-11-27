import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('CardBackImage', () => {
    it('puts a pattern on the back of a deck, and Standaard takes it off', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card_back.chance');

        const first = renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: 'Patroon' }));

        expect(
            screen.getByText('Patroon op de achterkant'),
        ).toBeInTheDocument();

        first.unmount();
        const patterned = await setup('card_back.chance', {
            elements: { 'card_back.chance': { pattern: 'dots' } },
        });
        renderWithI18n(<ElementPanel {...patterned.props} />);
        await user.click(screen.getByRole('radio', { name: 'Standaard' }));

        expect(
            patterned.session.edition.elements['card_back.chance']?.pattern,
        ).toBeUndefined();
        expect(session.edition.elements['card_back.chance']).toBeUndefined();
    });
});

describe('PlainImage', () => {
    it('takes the photo off a pawn with Geen', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('pawn.01', {
            elements: { 'pawn.01': { photo: photo('p') } },
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: 'Geen' }));

        expect(session.edition.elements['pawn.01']?.photo).toBeUndefined();
    });
});
