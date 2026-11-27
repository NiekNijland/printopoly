import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { renderWithI18n } from '@/testing/render';

import { LidNameControls, TitleControls } from './title-controls';

describe('TitleControls', () => {
    it('switches the light band off and puts the title back with Standaard', async () => {
        const user = userEvent.setup();
        const { session } = await setup('box_lid', {
            elements: { box_lid: { titleOffset: 0.5 } },
        });

        renderWithI18n(
            <TitleControls
                session={session}
                editKey="box_lid"
                offset={0.5}
                band
            />,
        );
        await user.click(
            screen.getByRole('checkbox', {
                name: 'Lichte band onder de titel',
            }),
        );

        expect(session.edition.elements.box_lid?.titleBand).toBe(false);

        await user.click(
            screen.getByRole('button', { name: /terug naar standaard/ }),
        );

        expect(session.edition.elements.box_lid).toBeUndefined();
    });

    it('shows the size and the switch for the title when it has them', async () => {
        const user = userEvent.setup();
        const { session } = await setup('board_center');

        renderWithI18n(
            <TitleControls
                session={session}
                editKey="board_center"
                offset={0}
                scale={0.8}
                hidden={false}
            />,
        );

        expect(screen.getByText('Grootte')).toBeInTheDocument();

        await user.click(screen.getByRole('checkbox', { name: 'Titel tonen' }));

        expect(session.edition.elements.board_center?.titleHidden).toBe(true);
    });
});

describe('LidNameControls', () => {
    it('offers the look of the name on the lid', async () => {
        const { session } = await setup('box_lid');

        renderWithI18n(
            <LidNameControls
                session={session}
                editKey="box_lid"
                value={undefined}
                theme={session.edition.theme}
            />,
        );

        expect(screen.getByText('Naam op het deksel')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /terug naar standaard/ }),
        ).toBeNull();
    });
});
