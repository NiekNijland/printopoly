import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import {
    menuButton,
    setup,
} from '@/features/edition/editor/testing/element-panel-setup';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('SwapDialogs', () => {
    it('moves the photo of a space to another one, and trades it with a photo there (B238)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', {
            elements: {
                'space.01': { photo: photo('mine') },
                'space.06': { photo: photo('theirs') },
            },
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: 'Naar ander vak…' }),
        );
        const dialog = await screen.findByRole('dialog');
        expect(
            within(dialog).getByText('Foto van Molenweg wisselen'),
        ).toBeVisible();
        const target = dialog.querySelector<HTMLElement>(
            '[data-photo-swap-target="space.06"]',
        );
        if (target === null) {
            throw new Error('no swap target space.06');
        }
        await user.click(target);

        expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
            'theirs',
        );
        expect(session.edition.elements['space.06']?.photo?.photoId).toBe(
            'mine',
        );
        // One undo step puts both back.
        session.undo();
        expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
            'mine',
        );
        expect(session.edition.elements['space.06']?.photo?.photoId).toBe(
            'theirs',
        );
    });

    it('swaps a street with another from the menu of the panel', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', { named: true });

        const Switcher = () => {
            const [key, setKey] = useState('space.01');

            return (
                <>
                    <button type="button" onClick={() => setKey('space.05')}>
                        Ander vak
                    </button>
                    <ElementPanel {...props} editKey={key} />
                </>
            );
        };
        renderWithI18n(<Switcher />);
        await user.click(menuButton('Meer voor Molenweg'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Wisselen met…' }),
        );
        const dialog = await screen.findByRole('dialog', {
            name: 'Molenweg wisselen met',
        });
        // Only streets: no station or utility in the list.
        expect(within(dialog).queryByText('Station Noord')).toBeNull();
        await user.click(
            within(dialog).getByRole('button', { name: /Veldweg/ }),
        );

        expect(session.edition.elements['space.01']).toBeUndefined();
        expect(session.edition.elements['space.03']?.name).toBe(
            'Jans Bierkelder',
        );
        expect(
            screen.getByText(/Molenweg en Veldweg gewisseld/),
        ).toBeInTheDocument();

        // The line belongs to the swap: another element does not show it.
        await user.click(screen.getByRole('button', { name: 'Ander vak' }));
        expect(screen.queryByText(/Molenweg en Veldweg gewisseld/)).toBeNull();
    });
});
