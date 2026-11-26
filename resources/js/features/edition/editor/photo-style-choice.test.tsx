import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from './element-panel';

describe('PhotoStyleChoice', () => {
    it('offers In kader and Hele vak only once there is a photo', async () => {
        const bare = await setup('space.01');

        renderWithI18n(<ElementPanel {...bare.props} />);
        expect(
            screen.queryByRole('radio', { name: 'Hele vak' }),
        ).not.toBeInTheDocument();
    });

    it('writes full on the element and goes back to framed by dropping the field', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', {
            withPhoto: true,
        });

        const first = renderWithI18n(<ElementPanel {...props} />);
        expect(screen.getByRole('radio', { name: 'In kader' })).toBeChecked();

        await user.click(screen.getByRole('radio', { name: 'Hele vak' }));
        expect(session.edition.elements['space.01']?.photoStyle).toBe('full');

        first.unmount();
        renderWithI18n(<ElementPanel {...props} edition={session.edition} />);
        expect(screen.getByRole('radio', { name: 'Hele vak' })).toBeChecked();

        await user.click(screen.getByRole('radio', { name: 'In kader' }));
        expect(
            session.edition.elements['space.01']?.photoStyle,
        ).toBeUndefined();
    });

    it('names the whole element after the part: a lid is no space (B252, Kees)', async () => {
        const lid = await setup('box_lid', { withPhoto: true });
        const first = renderWithI18n(<ElementPanel {...lid.props} />);
        expect(
            screen.getByRole('radio', { name: 'Hele deksel' }),
        ).toBeInTheDocument();
        expect(screen.queryByText('Hele vak')).toBeNull();
        first.unmount();

        const space = await setup('space.01', { withPhoto: true });
        renderWithI18n(<ElementPanel {...space.props} />);
        expect(
            screen.getByRole('radio', { name: 'Hele vak' }),
        ).toBeInTheDocument();
    });
});
