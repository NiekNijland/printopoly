import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('PawnCountField', () => {
    it('takes out the last pawns, not the one on screen (bug 27)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('pawn.08');

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: '4' }));
        expect(
            Array.from({ length: 8 }, (_, i) => `pawn.0${i + 1}`).filter(
                (key) => session.edition.elements[key]?.hidden !== true,
            ),
        ).toEqual(['pawn.01', 'pawn.02', 'pawn.03', 'pawn.04']);
    });
});
