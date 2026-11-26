import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from './element-panel';

describe('PartStyleField', () => {
    it('offers the style of the cards in Stijl of a card, without free layers (B269)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chance.12');

        const { container } = renderWithI18n(
            <ElementPanel {...props} area={{ w: 63, h: 88 }} />,
        );
        expect(
            container.querySelector('[data-part-style="cards"]'),
        ).not.toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Tekst toevoegen' }),
        ).toBeNull();
        await user.click(
            container.querySelector<HTMLElement>(
                '[data-part-style="cards"] label[data-choice="vintage"]',
            ) ?? document.body,
        );
        expect(session.edition.elements['style.cards']).toEqual({
            style: 'vintage',
        });
    });
});
