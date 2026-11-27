import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';

import {
    context,
    setup,
} from '@/features/edition/editor/testing/element-panel-setup';
import { fakeIngest } from '@/testing/ingest';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('PhotoTools', () => {
    it('says on what the photo is printed, not always "op het bord" (R5-08)', async () => {
        const space = await setup('space.01', { withPhoto: true });
        const first = renderWithI18n(<ElementPanel {...space.props} />);
        expect(screen.getByTestId('photo-paper-size')).toHaveTextContent(
            /^Op het bord is de foto ongeveer 40 bij 30 mm, met ongeveer \d+ ppi\./,
        );
        first.unmount();

        const pawn = await setup('pawn.01', { withPhoto: true });
        const second = renderWithI18n(<ElementPanel {...pawn.props} />);
        expect(screen.getByTestId('photo-paper-size')).toHaveTextContent(
            /^Op de pion is de foto ongeveer 40 bij 30 mm, met ongeveer \d+ ppi\./,
        );
        second.unmount();

        // A large photo, such as on the lid, gets its size only: a face fills it anyway.
        const lid = await setup('box_lid', { withPhoto: true });
        renderWithI18n(
            <ElementPanel
                {...lid.props}
                context={{ ...context, frame: { w: 267, h: 180 } }}
            />,
        );
        expect(screen.getByTestId('photo-paper-size')).toHaveTextContent(
            /^Op het deksel is de foto ongeveer 267 bij 180 mm, met ongeveer \d+ ppi\.$/,
        );
    });

    it('shows zoom, rotate, remove and black and white once there is a photo', async () => {
        const { props } = await setup('space.01', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);

        expect(
            screen.getByRole('button', { name: 'Andere foto' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Foto' })).toBeChecked();
        expect(screen.getByRole('slider')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Kwartslag draaien' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('checkbox', { name: 'Zwart-wit' }),
        ).toBeInTheDocument();
    });

    it('zooms 100 to 300%, rotates, goes black and white and reports the resolution', async () => {
        const user = userEvent.setup();
        const { props, onAct } = await setup('space.01', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);
        const slider = screen.getByRole('slider', { name: 'Zoom 100%' });

        expect(slider).toHaveAttribute('aria-valuemin', '100');
        expect(slider).toHaveAttribute('aria-valuemax', '300');
        expect(screen.getByText('Scherp genoeg')).toBeInTheDocument();

        slider.focus();
        await user.keyboard('{End}');
        expect(onAct).toHaveBeenLastCalledWith({ type: 'zoom-to', scale: 3 });

        await user.click(
            screen.getByRole('button', { name: 'Kwartslag draaien' }),
        );
        expect(onAct).toHaveBeenLastCalledWith({ type: 'rotate', turns: 1 });

        await user.click(screen.getByRole('checkbox', { name: 'Zwart-wit' }));
        expect(onAct).toHaveBeenLastCalledWith({ type: 'grayscale', on: true });

        await user.click(screen.getByRole('button', { name: 'Inzoomen' }));
        expect(onAct).toHaveBeenLastCalledWith(
            { type: 'zoom-by', delta: 0.1 },
            'Zoom 110%',
        );
    });

    it('removes the photo', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: 'Geen' }));

        expect(session.edition.elements['space.01']?.photo).toBeUndefined();
    });

    // Bug 16 (ronde 3): "Foto kiezen" made way for "Andere foto" and the focus fell to body.
    it('puts the focus on Andere foto after the first photo', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        fakeIngest.ingestPhoto.mockResolvedValue({
            ok: true,
            record: {
                id: 'photo-1',
                editionId: 'sample-edition-1',
                blob: new Blob(['x']),
                width: 800,
                height: 600,
                createdAt: 1,
            },
        });

        const Live = () => {
            const [edition, setEdition] = useState(session.edition);
            useEffect(
                () => session.subscribe(() => setEdition(session.edition)),
                [],
            );

            return <ElementPanel {...props} edition={edition} />;
        };

        renderWithI18n(<Live />);
        const input = screen.getByTestId('photo-input');
        vi.spyOn(input, 'click').mockImplementation(() => {});
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        // The file picker took the focus away and gave it back to nothing.
        const active = document.activeElement;
        if (active instanceof HTMLElement) {
            active.blur();
        }
        fireEvent.change(input, {
            target: {
                files: [new File(['x'], 'strand.jpg', { type: 'image/jpeg' })],
            },
        });

        const replace = await screen.findByRole('button', {
            name: 'Andere foto',
        });
        await waitFor(() => expect(replace).toHaveFocus());
    });

    it('offers Vullend and Passend for a photo, and Passend acts on the photo (B168)', async () => {
        const user = userEvent.setup();
        const { props } = await setup('space.01', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('radio', { name: 'Passend, hele foto' }),
        );

        expect(props.onAct).toHaveBeenCalledWith(
            { type: 'fit', on: true },
            'De hele foto staat in het kader.',
        );
    });
});
