import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('SpaceImage', () => {
    it('offers the standard icon, another icon or a photo on a station', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.05', {
            elements: { 'space.05': { icon: { preset: 'gift' } } },
        });

        renderWithI18n(<ElementPanel {...props} />);

        expect(
            screen.getByRole('radio', { name: 'Ander icoon' }),
        ).toBeChecked();

        await user.click(screen.getByRole('radio', { name: /Standaard/ }));

        expect(session.edition.elements['space.05']?.icon).toBeUndefined();
    });

    it('moves a photo between the whole space and the spot of the icon', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.05', {
            elements: { 'space.05': { photo: photo('mine') } },
        });

        const first = renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('radio', {
                name: 'Klein, op de plek van het icoon',
            }),
        );

        const icon = session.edition.elements['space.05']?.icon;
        expect(session.edition.elements['space.05']?.photo).toBeUndefined();
        expect(icon !== undefined && 'photo' in icon).toBe(true);

        first.unmount();
        renderWithI18n(<ElementPanel {...props} edition={session.edition} />);
        await user.click(screen.getByRole('radio', { name: 'Vult het vak' }));

        expect(session.edition.elements['space.05']?.photo?.photoId).toBe(
            'mine',
        );
        expect(session.edition.elements['space.05']?.icon).toBeUndefined();
    });
});
