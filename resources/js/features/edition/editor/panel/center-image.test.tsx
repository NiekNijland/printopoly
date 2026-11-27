import { cleanup, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
    context,
    setup,
} from '@/features/edition/editor/testing/element-panel-setup';
import { startingPlacement } from '@/lib/render/editor-placements';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

const ingest = vi.hoisted(() => vi.fn());
vi.mock('@/features/edition/editor/ingest', () => ({ ingestPhoto: ingest }));

describe('CenterImage', () => {
    beforeEach(() => ingest.mockReset());

    it('opens the files right away when you choose Logo without a logo, and not when there is one (B179)', async () => {
        const user = userEvent.setup();
        const click = vi
            .spyOn(HTMLInputElement.prototype, 'click')
            .mockImplementation(() => undefined);
        const { props, session } = await setup('board_center');

        const { unmount } = renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: 'Logo' }));

        expect(session.edition.elements['board_center']?.centerMode).toBe(
            'logo',
        );
        expect(click).toHaveBeenCalledTimes(1);
        expect(click.mock.contexts[0]).toBe(screen.getByTestId('photo-input'));
        unmount();

        click.mockClear();
        const withLogo = await setup('board_center', { withPhoto: true });
        renderWithI18n(<ElementPanel {...withLogo.props} />);
        await user.click(screen.getByRole('radio', { name: 'Logo' }));
        expect(click).not.toHaveBeenCalled();
        click.mockRestore();
    });

    it('puts the four centre choices in two rows of two, so each fits with large letters (Gerda, Lukas: R5-18)', async () => {
        const { props } = await setup('board_center');

        renderWithI18n(<ElementPanel {...props} />);
        const choice = document.querySelector<HTMLElement>(
            '[data-slot="toggle-group"][aria-label="Wat staat er in het midden?"]',
        );
        if (choice === null) {
            throw new Error('the centre has no choice of layout');
        }

        expect(choice).toHaveClass('grid', 'grid-cols-2');
        expect(within(choice).getByRole('radio', { name: 'Logo' })).toHaveClass(
            'nth-[n+3]:border-t',
            'odd:border-l-0',
        );
    });

    it('never calls the plain ground of the centre "Bordgroen", which does not fit every theme (bug 38)', async () => {
        const { props } = await setup('board_center');

        renderWithI18n(<ElementPanel {...props} />);
        // Since B187 the plain ground is simply the layout "Naam"; the whole-centre photo is a layout of its own.
        expect(screen.getByRole('radio', { name: 'Naam' })).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Foto over het hele midden' }),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Bordgroen/)).toBeNull();
    });

    it('offers Passend for a logo in the board centre and fits a logo already placed (B168)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('board_center', {
            withPhoto: true,
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.queryByRole('radio', { name: 'Passend, hele foto' }),
        ).not.toBeInTheDocument();
        await user.click(screen.getByRole('radio', { name: 'Logo' }));

        expect(session.edition.elements['board_center']).toMatchObject({
            centerMode: 'logo',
            photo: { photoId: 'p1', fit: true },
        });
    });

    it('shows Vullend and Passend for the photo above the name too (B168)', async () => {
        const { props } = await setup('board_center', {
            elements: {
                board_center: {
                    centerMode: 'photo',
                    photo: startingPlacement('p1', {
                        width: context.source.w,
                        height: context.source.h,
                    }),
                },
            },
        });

        renderWithI18n(<ElementPanel {...props} context={context} />);
        expect(screen.getByRole('radio', { name: 'Vullend' })).toBeChecked();
        expect(
            screen.getByRole('radio', { name: 'Passend, hele foto' }),
        ).not.toBeChecked();
    });

    it('puts a new logo in the board centre whole and centred (B168)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('board_center', {
            elements: { board_center: { centerMode: 'logo' } },
        });
        ingest.mockResolvedValue({
            ok: true,
            record: {
                id: 'logo-1',
                editionId: 'sample-edition-1',
                blob: new Blob(['x']),
                width: 600,
                height: 900,
                createdAt: 1,
            },
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['x'], 'logo.png', { type: 'image/png' }),
        );

        await waitFor(() =>
            expect(
                session.edition.elements['board_center']?.photo?.photoId,
            ).toBe('logo-1'),
        );
        expect(session.edition.elements['board_center']).toMatchObject({
            photoAspect: 600 / 900,
            photo: { cx: 0.5, cy: 0.5, scale: 1, fit: true },
        });
    });

    it('keeps the one photo of the centre when the layout changes (UX 1, ronde 4)', async () => {
        const user = userEvent.setup();
        const named = await setup('board_center', {
            elements: {
                board_center: { centerMode: 'photo', photo: photo('p1') },
            },
        });
        renderWithI18n(<ElementPanel {...named.props} />);

        await user.click(
            screen.getByRole('radio', { name: 'Foto over het hele midden' }),
        );
        const full = named.session.edition.elements['board_center'];
        expect(full?.background?.photoId).toBe('p1');
        expect(full?.photo).toBeUndefined();
        expect(full?.centerMode).toBeUndefined();
        cleanup();

        const whole = await setup('board_center', {
            elements: { board_center: { background: photo('p2') } },
        });
        renderWithI18n(<ElementPanel {...whole.props} />);
        expect(
            screen.getByRole('radio', { name: 'Foto over het hele midden' }),
        ).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Logo' }));
        const logo = whole.session.edition.elements['board_center'];
        expect(logo?.photo?.photoId).toBe('p2');
        expect(logo?.photo?.fit).toBe(true);
        expect(logo?.background).toBeUndefined();
        expect(logo?.centerMode).toBe('logo');
    });

    it('keeps the photo chosen right after "Foto over het hele midden" (R5-02)', async () => {
        const user = userEvent.setup();
        const click = vi
            .spyOn(HTMLInputElement.prototype, 'click')
            .mockImplementation(() => undefined);
        const { props, session } = await setup('board_center');
        ingest.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: 'kerk',
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 2400,
                    height: 3200,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} />);
        const field = screen.getByTestId('background-input');

        await user.click(
            screen.getByRole('radio', { name: 'Foto over het hele midden' }),
        );
        // The file chooser opened on this field: it has to stay, or the chosen file goes nowhere.
        expect(click.mock.contexts[0]).toBe(field);
        expect(field.isConnected).toBe(true);
        click.mockRestore();

        await user.upload(
            field,
            new File(['a'], 'kerk.jpg', { type: 'image/jpeg' }),
        );
        await waitFor(() =>
            expect(
                session.edition.elements['board_center']?.background?.photoId,
            ).toBe('kerk'),
        );
        // A standing photo starts with its faces a third from the top of the centre, clear of the fold (R5-03).
        const start = session.edition.elements['board_center']?.background;
        expect(start?.cy).toBeCloseTo(1 / 3 + 0.75 / 6, 2);
    });

    it('starts a photo moved over the whole centre clear of the fold, not with the crop of its square (R5-03)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('board_center', {
            elements: {
                board_center: {
                    centerMode: 'photo',
                    photo: { ...photo('p1'), cx: 0.5, cy: 1 / 3, scale: 1.4 },
                },
            },
        });
        props.cache.add({
            id: 'p1',
            editionId: 'e',
            blob: new Blob(['x']),
            width: 3000,
            height: 4000,
            createdAt: 1,
        });
        renderWithI18n(<ElementPanel {...props} />);

        await user.click(
            screen.getByRole('radio', { name: 'Foto over het hele midden' }),
        );
        const background = session.edition.elements['board_center']?.background;
        expect(background?.photoId).toBe('p1');
        expect(background?.scale).toBe(1);
        expect(background?.cy).toBeCloseTo(1 / 3 + 0.75 / 6, 2);
    });
});
