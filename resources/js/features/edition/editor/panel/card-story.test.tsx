import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('CardStory', () => {
    it('folds the standard text of a standard card under its story', async () => {
        const user = userEvent.setup();
        const { props } = await setup('card.chance.03');

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: /Standaardtekst/ }),
        );

        expect(screen.getByText(/Wat er gebeurt/)).toBeVisible();
    });

    it('writes what an amount is for, and empties it with spaces only', async () => {
        const { props, session } = await setup('card.chest.03');
        const { container } = renderWithI18n(<ElementPanel {...props} />);
        const purpose = container.querySelector<HTMLInputElement>(
            '[data-field="purpose"]',
        );
        if (purpose === null) {
            throw new Error('no purpose field');
        }

        fireEvent.change(purpose, { target: { value: 'de tandarts' } });

        expect(session.edition.elements['card.chest.03']?.purpose).toBe(
            'de tandarts',
        );

        fireEvent.change(purpose, { target: { value: '  ' } });

        expect(
            session.edition.elements['card.chest.03']?.purpose,
        ).toBeUndefined();
    });

    it('has no standard text on an extra card', async () => {
        const { props } = await setup('card.chest.17', {
            elements: { 'card.chest.17': { added: true, text: 'Een' } },
        });

        renderWithI18n(<ElementPanel {...props} />);

        expect(
            screen.queryByRole('button', { name: /Standaardtekst/ }),
        ).toBeNull();
    });
});
