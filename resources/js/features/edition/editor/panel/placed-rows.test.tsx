import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { fakeIngest } from '@/testing/ingest';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel } from '../element-panel';

describe('PlacedRows', () => {
    it('moves a photo of the list to another space, and trades places with a photo there (UX 4, ronde 4)', async () => {
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
            <ElementPanel
                {...props}
                siblings={['space.03', 'space.06', 'space.08']}
            />,
        );
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'oma.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'kerk.jpg', { type: 'image/jpeg' }),
        ]);
        await waitFor(() =>
            expect(session.edition.elements['space.03']?.photo?.photoId).toBe(
                'photo-2',
            ),
        );

        // kerk.jpg goes to space 08 instead: space 03 is empty again.
        const kerk = screen.getByRole('combobox', {
            name: 'Waar komt kerk.jpg?',
        });
        const label = (key: string) =>
            screen
                .getAllByRole<HTMLOptionElement>('option')
                .find((option) => option.value === key)?.textContent ?? '';
        await user.selectOptions(kerk, 'space.08');
        expect(session.edition.elements['space.08']?.photo?.photoId).toBe(
            'photo-2',
        );
        expect(session.edition.elements['space.03']?.photo).toBeUndefined();

        // oma.jpg to space 08: the two photos trade places.
        await user.selectOptions(
            screen.getByRole('combobox', { name: 'Waar komt oma.jpg?' }),
            'space.08',
        );
        expect(session.edition.elements['space.08']?.photo?.photoId).toBe(
            'photo-1',
        );
        expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
            'photo-2',
        );
        expect(label('space.06')).not.toBe('');

        // Ongedaan maken puts every space back as it was before the choice.
        await user.click(
            screen.getByRole('button', { name: 'Ongedaan maken' }),
        );
        for (const key of ['space.01', 'space.03', 'space.06', 'space.08']) {
            expect(session.edition.elements[key]?.photo).toBeUndefined();
        }
    });
});
