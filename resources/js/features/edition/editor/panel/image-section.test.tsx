import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('ImageSection', () => {
    it('has no choice on a corner space', async () => {
        const { props } = await setup('space.00', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);

        expect(
            screen.queryByRole('radio', { name: 'Hele vak' }),
        ).not.toBeInTheDocument();
    });

    it('picks another icon in the image section of a special space and goes back to the standard (B136)', async () => {
        const { props, session } = await setup('space.30');
        const user = userEvent.setup();

        renderWithI18n(<ElementPanel {...props} />);

        expect(
            screen.getByRole('heading', { name: 'Afbeelding' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Standaardicoon' }),
        ).toBeChecked();
        // Only the choices this space has: Naar de gevangenis takes a photo too.
        expect(screen.getByRole('radio', { name: 'Foto' })).toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: 'Ander icoon' }));
        await user.click(screen.getByRole('radio', { name: 'Handboeien' }));
        expect(session.edition.elements['space.30']?.icon).toEqual({
            preset: 'handcuffs',
        });

        // The arrow keys move through the quick choice, Space picks (shadcn ToggleGroup, B196).
        screen.getByRole('radio', { name: 'Handboeien' }).focus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('radio', { name: 'Fluitje' })).toHaveFocus();
        await user.keyboard(' ');
        expect(session.edition.elements['space.30']?.icon).toEqual({
            preset: 'whistle',
        });

        // The whole set: search by name and pick a lucide drawing, which shows on the space.
        await user.click(
            screen.getByRole('button', { name: /Zoek uit \d+ iconen/ }),
        );
        await user.type(
            await screen.findByRole('combobox', { name: 'Kies een icoon' }),
            'tunnel',
        );
        await user.click(
            await screen.findByRole('option', { name: /Trein in een tunnel/ }),
        );
        expect(session.edition.elements['space.30']?.icon).toEqual({
            preset: 'lucide:train-front-tunnel',
        });

        await user.click(screen.getByRole('radio', { name: 'Standaardicoon' }));
        expect(session.edition.elements['space.30']?.icon).toBeUndefined();

        // One Foto choice (Niek, 22 nov): it fills the space, or sits small and whole where the icon is.
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        expect(
            screen.getByRole('radio', { name: 'Vult het vak' }),
        ).toBeChecked();
        await user.click(
            screen.getByRole('radio', {
                name: 'Klein, op de plek van het icoon',
            }),
        );
        expect(
            screen.getByRole('button', { name: 'Afbeelding kiezen' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('radio', { name: 'Eigen afbeelding' }),
        ).toBeNull();
    });

    // Vindbaarheid point 2: Foto opens the files in one step, like Logo; no second "Foto kiezen" button.
    it('starts with the choice Geen or Foto, and Foto opens the files at once', async () => {
        const user = userEvent.setup();
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        const input = screen.getByTestId('photo-input');
        const opened = vi.spyOn(input, 'click').mockImplementation(() => {});

        expect(screen.getByRole('radio', { name: 'Geen' })).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        expect(opened).toHaveBeenCalledOnce();
        // Until a photo is there, Geen stays chosen: a second click on Foto opens the files again.
        expect(screen.getByRole('radio', { name: 'Geen' })).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        expect(opened).toHaveBeenCalledTimes(2);
        expect(
            screen.queryByRole('button', { name: 'Foto kiezen' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Kwartslag draaien' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Foto weghalen' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('checkbox', { name: 'Zwart-wit' }),
        ).not.toBeInTheDocument();
    });

    it('offers the logo of the board on the box lid, whole and straight (B241)', async () => {
        const user = userEvent.setup();
        const logo = { ...photo('logo'), rotation: 0 };
        const { props, session } = await setup('box_lid', {
            elements: {
                board_center: { centerMode: 'logo', photo: logo },
            },
        });

        renderWithI18n(<ElementPanel {...props} title="Doosdeksel" />);
        await user.click(
            screen.getByRole('radio', { name: 'Logo van het bord' }),
        );

        expect(session.edition.elements['box_lid']?.photo).toEqual({
            photoId: 'logo',
            cx: 0.5,
            cy: 0.5,
            scale: 1,
            rotation: 0,
            grayscale: false,
            fit: true,
        });
    });

    it('has no logo choice on the lid without a logo in the centre (B241)', async () => {
        const { props } = await setup('box_lid');

        renderWithI18n(<ElementPanel {...props} title="Doosdeksel" />);
        expect(
            screen.queryByRole('radio', { name: 'Logo van het bord' }),
        ).toBeNull();
    });

    it('puts the photo of a street on its title deed unless switched off (B157)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);
        const also = screen.getByRole('checkbox', {
            name: 'Ook op het eigendomsbewijs',
        });

        expect(also).toBeChecked();
        await user.click(also);
        expect(session.edition.elements['space.01']?.deedPhoto).toBe(false);
    });

    it('offers only a small image where the icon is on a space that shows no photo', async () => {
        const { props } = await setup('space.02');
        const user = userEvent.setup();

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.queryByTestId('photo-input')).not.toBeInTheDocument();
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        expect(
            screen.queryByRole('radio', { name: 'Vult het vak' }),
        ).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Afbeelding kiezen' }),
        ).toBeInTheDocument();
    });
});
