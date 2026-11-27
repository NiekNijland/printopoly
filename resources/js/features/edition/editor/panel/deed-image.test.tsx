import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
    context,
    setup,
} from '@/features/edition/editor/testing/element-panel-setup';
import { startingPlacement } from '@/lib/render/editor-placements';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('DeedImage', () => {
    it('lets a title deed show the photo of its space, none, or its own (B157)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('deed.01', {
            elements: {
                'space.01': {
                    photo: startingPlacement('p1', {
                        width: context.source.w,
                        height: context.source.h,
                    }),
                },
            },
        });

        renderWithI18n(<ElementPanel {...props} />);

        expect(
            screen.getByRole('radio', { name: 'Foto van het vak' }),
        ).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Geen' }));
        expect(session.edition.elements['space.01']?.deedPhoto).toBe(false);
    });
});
