import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('TitleStyleField', () => {
    it('picks a look for the name on the board centre and Zoals het thema puts it back', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('board_center');
        const view = renderWithI18n(
            <ElementPanel {...props} area={{ w: 360, h: 360 }} />,
        );

        expect(
            screen.getByRole('radio', { name: 'Zoals het thema' }),
        ).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Stempel' }));
        expect(session.edition.elements['board_center']?.titleStyle).toBe(
            'stamp',
        );

        view.unmount();
        renderWithI18n(
            <ElementPanel
                {...props}
                edition={session.edition}
                resolved={resolveEdition(session.edition)}
                area={{ w: 360, h: 360 }}
            />,
        );
        expect(screen.getByRole('radio', { name: 'Stempel' })).toBeChecked();
        await user.click(
            screen.getByRole('radio', { name: 'Zoals het thema' }),
        );
        expect(session.edition.elements['board_center']).toBeUndefined();
    });

    it('gives the box lid its own choice, apart from the board centre', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('box_lid', {
            elements: { board_center: { titleStyle: 'bar' } },
        });
        renderWithI18n(<ElementPanel {...props} area={{ w: 267, h: 267 }} />);

        expect(screen.getByText('Naam op het deksel')).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Zoals het thema' }),
        ).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Sierlijk' }));

        expect(session.edition.elements['box_lid']?.titleStyle).toBe('script');
        expect(session.edition.elements['board_center']?.titleStyle).toBe(
            'bar',
        );
    });

    it('has no choice on a lid with a photo of its own, where the name is plain text', async () => {
        const { props } = await setup('box_lid', { withPhoto: true });
        renderWithI18n(<ElementPanel {...props} area={{ w: 267, h: 267 }} />);

        expect(
            screen.queryByRole('radio', { name: 'Zoals het thema' }),
        ).toBeNull();
    });
});
