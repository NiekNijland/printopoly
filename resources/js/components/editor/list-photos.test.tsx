import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';

import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
import { MemoryEditionStorage } from '@/lib/edition/storage';
import { elementLabel } from '@/lib/editor/catalogue';
import { PhotoCache } from '@/lib/editor/photo-cache';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { ListPhotosButton } from './list-photos';
import { PlacedList } from './panel/placed-list';
import { usePhotoUpload } from './panel/use-photo-upload';

const ingest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/editor/ingest', () => ({ ingestPhoto: ingest }));

/** The photo button and its summary as the board list has them (B237). */
const Harness = ({ session }: { session: EditionSession }) => {
    const [edition, setEdition] = useState(session.edition);
    useEffect(
        () => session.subscribe(() => setEdition(session.edition)),
        [session],
    );
    const [cache] = useState(
        () => new PhotoCache(() => Promise.resolve(undefined)),
    );
    const upload = usePhotoUpload({
        session,
        edition,
        editKey: null,
        cache,
        siblings: [],
        canHold: true,
        labelOf: (key) => elementLabel(key, edition, 'nl'),
        pasteShortcut: false,
    });

    return (
        <>
            <ListPhotosButton upload={upload} />
            {upload.placed?.kind === 'batch' && (
                <PlacedList
                    placed={upload.placed}
                    onUndo={upload.undoPlaced}
                    onClose={upload.dismissPlaced}
                    onMove={upload.movePlaced}
                    onPlaceMissed={(index, key) =>
                        void upload.placeMissed(index, key)
                    }
                />
            )}
        </>
    );
};

describe('photos by name from the board list (B237)', () => {
    it('places a photo by its name, and asks where a photo without a matching name goes', async () => {
        installMemoryServices();
        const user = userEvent.setup();
        const edition = sampleEdition();
        const session = new EditionSession(edition, {
            storage: new MemoryEditionStorage(),
            bus: new EditionBus(null, 'w'),
            now: () => 5,
            debounceMs: 1000,
        });
        let n = 0;
        ingest.mockImplementation(() =>
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

        renderWithI18n(<Harness session={session} />);
        expect(
            screen.getByRole('button', {
                name: /Een foto met de naam van een vak of pion/,
            }),
        ).toBeVisible();
        await user.upload(screen.getByTestId('list-photos-input'), [
            new File(['a'], 'marktplein.JPG', { type: 'image/jpeg' }),
            new File(['b'], 'IMG_0001.jpg', { type: 'image/jpeg' }),
        ]);

        await waitFor(() =>
            expect(session.edition.elements['space.18']?.photo?.photoId).toBe(
                'photo-1',
            ),
        );
        const missed = await screen.findByTestId('photos-missed');
        expect(within(missed).getByText('IMG_0001.jpg')).toBeVisible();
        expect(
            screen.getByText('Deze foto vond geen plek. Kies er zelf een.'),
        ).toBeVisible();
        // Nothing else changed: a photo without a name waits for a choice.
        expect(Object.keys(session.edition.elements)).toEqual(['space.18']);

        await user.selectOptions(
            within(missed).getByRole('combobox'),
            'space.01',
        );
        await waitFor(() =>
            expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
                'photo-2',
            ),
        );
        expect(screen.queryByTestId('photos-missed')).toBeNull();

        // Ongedaan maken takes both away again.
        await user.click(
            screen.getByRole('button', { name: 'Ongedaan maken' }),
        );
        expect(session.edition.elements).toEqual({});
    });
});
