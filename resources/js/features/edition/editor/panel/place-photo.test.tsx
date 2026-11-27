import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { setElement } from '@/lib/render/edition-changes';
import { photo } from '@/testing/edition-test-utils';
import { fakeIngest } from '@/testing/ingest';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('PlacePhoto', () => {
    it('gives several chosen photos to the next elements', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;

        fakeIngest.ingestPhoto.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
        ]);

        await waitFor(() =>
            expect(session.edition.elements['space.03']?.photo?.photoId).toBe(
                'photo-2',
            ),
        );
        expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
            'photo-1',
        );
    });

    it('gives several photos only to empty elements of the same kind, and says where they went (bug 7, ronde 4)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;
        // Space 03 already has a photo: a choice of several never overwrites it.
        const { change } = setElement(session.edition, 'space.03', {
            photo: photo('old'),
        });
        if (change !== null) {
            session.apply([change]);
        }

        fakeIngest.ingestPhoto.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        // Standard board: 02 Community Chest and 04 income tax have no photo frame, 03 a photo already, 05 is a
        // station and 10 a corner; 06 and 08 are empty streets.
        renderWithI18n(
            <ElementPanel
                {...props}
                siblings={[
                    'space.02',
                    'space.03',
                    'space.04',
                    'space.05',
                    'space.06',
                    'space.07',
                    'space.08',
                    'space.10',
                ]}
            />,
        );
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
            new File(['c'], 'c.jpg', { type: 'image/jpeg' }),
            new File(['d'], 'd.jpg', { type: 'image/jpeg' }),
        ]);

        await waitFor(() =>
            expect(session.edition.elements['space.08']?.photo?.photoId).toBe(
                'photo-3',
            ),
        );
        expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
            'photo-1',
        );
        expect(session.edition.elements['space.06']?.photo?.photoId).toBe(
            'photo-2',
        );
        expect(session.edition.elements['space.03']?.photo?.photoId).toBe(
            'old',
        );
        expect(session.edition.elements['space.05']?.photo).toBeUndefined();
        expect(session.edition.elements['space.10']?.photo).toBeUndefined();
        expect(session.edition.elements['space.02']?.photo).toBeUndefined();
        expect(await screen.findByText(/3 foto's geplaatst/)).toBeVisible();
        expect(screen.getByText(/Overgeslagen: 5 vakken/)).toBeVisible();
        // The fourth photo found no empty street: the list asks where it goes (B237).
        expect(screen.getByText(/Deze foto vond geen plek/)).toBeVisible();
        expect(
            within(screen.getByTestId('photos-missed')).getByText('d.jpg'),
        ).toBeVisible();
    });

    it('puts photos named after a space on that space, says so, and undoes them in one step (B237)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;

        fakeIngest.ingestPhoto.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} siblings={['space.03']} />);
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'Kroonpléin.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'IMG_0001.jpg', { type: 'image/jpeg' }),
        ]);

        await waitFor(() =>
            expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
                'photo-2',
            ),
        );
        // Kroonplein is space 39, far from the open space: its name brought it there.
        expect(session.edition.elements['space.39']?.photo?.photoId).toBe(
            'photo-1',
        );
        const list = screen.getByTestId('photos-placed');
        expect(within(list).getByText('1 op naam gevonden')).toBeVisible();
        expect(list.querySelectorAll('[data-placed-how="name"]')).toHaveLength(
            1,
        );
        expect(within(list).getByText('op naam')).toBeVisible();

        await user.click(
            screen.getByRole('button', { name: 'Ongedaan maken' }),
        );
        expect(session.edition.elements['space.39']).toBeUndefined();
        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('starts a photo on the invitation whole, so a standing drawing keeps its head (UX 4, ronde 4)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('invitation');

        fakeIngest.ingestPhoto.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: 'portrait',
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 600,
                    height: 900,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['a'], 'mila.jpg', { type: 'image/jpeg' }),
        );

        await waitFor(() =>
            expect(session.edition.elements['invitation']?.photo?.fit).toBe(
                true,
            ),
        );
    });

    it('says one skipped space in the singular, not "1 vakken"', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;

        fakeIngest.ingestPhoto.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(
            <ElementPanel {...props} siblings={['space.02', 'space.03']} />,
        );
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
        ]);

        await waitFor(() =>
            expect(session.edition.elements['space.03']?.photo?.photoId).toBe(
                'photo-2',
            ),
        );
        expect(
            await screen.findByText(/Overgeslagen: 1 vak met al een foto/),
        ).toBeVisible();
        expect(screen.queryByText(/1 vakken/)).toBeNull();
    });

    it('lists which photo went where after several, and undoes them all in one step (ronde 3, UX 1)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;

        fakeIngest.ingestPhoto.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'bakker.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'kerk.jpg', { type: 'image/jpeg' }),
        ]);

        const list = await screen.findByTestId('photos-placed');
        expect(within(list).getByText("2 foto's geplaatst")).toBeVisible();
        expect(within(list).getByText('bakker.jpg')).toBeVisible();
        expect(within(list).getByText('kerk.jpg')).toBeVisible();

        await user.click(
            within(list).getByRole('button', { name: 'Ongedaan maken' }),
        );

        expect(session.edition.elements['space.01']?.photo).toBeUndefined();
        expect(session.edition.elements['space.03']?.photo).toBeUndefined();
        expect(within(list).getByText(/Teruggezet/)).toBeVisible();
    });

    it('starts a standing photo at the top third, where the faces are (ronde 3, UX 1)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('pawn.01');

        fakeIngest.ingestPhoto.mockResolvedValue({
            ok: true,
            record: {
                id: 'portrait',
                editionId: 'e',
                blob: new Blob(['x']),
                width: 3000,
                height: 4000,
                createdAt: 1,
            },
        });
        renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['a'], 'oma.jpg', { type: 'image/jpeg' }),
        );

        await waitFor(() =>
            expect(session.edition.elements['pawn.01']?.photo?.cy).toBeCloseTo(
                1 / 3,
            ),
        );
    });
});
