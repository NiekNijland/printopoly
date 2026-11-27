import { describe, expect, it, vi } from 'vitest';

import type { Edition, PhotoRecord } from '@/lib/render/edition-types';
import { makeEdition, photo } from '@/testing/edition-test-utils';

import { shareBoardRequest } from './editor-share-board';

const withPhotos = (): Edition => {
    return {
        ...makeEdition(),
        elements: {
            'space.01': { name: 'Molenweg', photo: photo('molen') },
            'space.03': { photo: { ...photo('zoom'), scale: 2 } },
            board_center: {
                name: 'Lisa en Thomas',
                photo: photo('stel'),
                background: photo('achter'),
            },
            'card.chance.01': { photo: photo('kaart') },
            'pawn.1': { photo: photo('pion') },
            'words.chest': { name: 'Huwelijkskas' },
        },
    };
};

const record = (id: string, type = 'image/jpeg'): PhotoRecord => {
    return {
        id,
        editionId: 'e1',
        blob: new Blob(['x'], { type }),
        width: 4000,
        height: 3000,
        createdAt: 0,
    };
};

const sharePhotoSizes = async (
    edition: Edition,
): Promise<Map<string, number>> => {
    const sizes = new Map<string, number>();
    await shareBoardRequest(
        edition,
        (id) => Promise.resolve(record(id)),
        (given, longSide) => {
            sizes.set(given.id, longSide);

            return Promise.resolve(null);
        },
    );

    return sizes;
};

describe('the photos of "Deel je bord" (R5-24)', () => {
    it('takes the photos on the board, larger in the centre, and none from cards or pawns', async () => {
        const sizes = await sharePhotoSizes(withPhotos());

        expect([...sizes.keys()].sort()).toEqual(
            ['achter', 'molen', 'stel', 'zoom'].sort(),
        );
        expect(sizes.get('molen')).toBe(360);
        expect(sizes.get('zoom')).toBe(720);
        expect(sizes.get('stel')).toBe(1000);
    });

    it('sends the edition with its own words and a small copy of each photo', async () => {
        const edition = withPhotos();
        const shrink = vi.fn((given: PhotoRecord, longSide: number) =>
            Promise.resolve({
                src: `data:image/jpeg;base64,${given.id}`,
                width: longSide,
                height: Math.round(longSide * 0.75),
            }),
        );

        const request = await shareBoardRequest(
            edition,
            (id) => Promise.resolve(id === 'achter' ? undefined : record(id)),
            shrink,
        );

        expect(request.edition).toBe(edition);
        expect(request.edition.elements['words.chest']?.name).toBe(
            'Huwelijkskas',
        );
        expect(request.photos.map((item) => item.id).sort()).toEqual(
            ['molen', 'stel', 'zoom'].sort(),
        );
        expect(request.photos.find((item) => item.id === 'stel')).toEqual({
            id: 'stel',
            src: 'data:image/jpeg;base64,stel',
            width: 1000,
            height: 750,
        });
    });

    it('leaves out a photo that cannot be drawn, and keeps the rest', async () => {
        const request = await shareBoardRequest(
            withPhotos(),
            (id) => Promise.resolve(record(id)),
            (given) =>
                given.id === 'molen'
                    ? Promise.reject(new Error('kapot'))
                    : Promise.resolve({ src: 'data:', width: 1, height: 1 }),
        );

        expect(request.photos.map((item) => item.id)).not.toContain('molen');
        expect(request.photos).toHaveLength(3);
    });
});
