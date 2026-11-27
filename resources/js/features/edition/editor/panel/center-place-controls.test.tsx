import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { ElementOverride } from '@/lib/render/edition-types';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { CenterPlaceControls } from './center-place-controls';

const controls = async (elements: Record<string, ElementOverride>) => {
    const { session } = await setup('board_center', { elements });
    renderWithI18n(
        <CenterPlaceControls
            session={session}
            editKey="board_center"
            resolved={resolveEdition(session.edition)}
            theme={session.edition.theme}
        />,
    );

    return session;
};

describe('CenterPlaceControls', () => {
    it('moves the name to the middle and warns about the folds', async () => {
        const user = userEvent.setup();
        const session = await controls({});

        expect(screen.getByText('Naam op het bord')).toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: 'In het midden' }));

        expect(session.edition.elements.board_center?.centerPlace).toBe(
            'middle',
        );
    });

    it('shows the hint in the middle, and puts everything back with Standaard', async () => {
        const user = userEvent.setup();
        const session = await controls({
            board_center: { centerPlace: 'middle', titleScale: 0.8 },
        });

        expect(
            screen.getByText(/Hier lopen de vouwlijnen/),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: /terug naar standaard/ }),
        );

        expect(session.edition.elements.board_center).toBeUndefined();
    });

    it('tilts a logo', async () => {
        const user = userEvent.setup();
        const session = await controls({
            board_center: { centerMode: 'logo', photo: photo('logo') },
        });

        expect(screen.getByText('Grootte van het logo')).toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: 'Schuin' }));

        expect(session.edition.elements.board_center?.logoTilt).toBe(true);
    });
});
