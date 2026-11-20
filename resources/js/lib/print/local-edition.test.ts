import { MemoryEditionStorage } from '@/lib/edition/storage';
import { makeEdition, photo } from '@/lib/edition/test-utils';
import type { Edition, PhotoRecord } from '@/lib/edition/types';

import { uploadPrintJob } from './api';
import { loadLocalEdition, neededPhotoIds } from './local-edition';
import { photoTargets, type PhotoTargets } from './photo-targets';

function record(id: string, editionId: string, text: string): PhotoRecord {
    return {
        id,
        editionId,
        blob: new Blob([text], { type: 'image/jpeg' }),
        width: 4000,
        height: 3000,
        createdAt: 1,
    };
}

async function stored(): Promise<{
    storage: MemoryEditionStorage;
    edition: Edition;
}> {
    const storage = new MemoryEditionStorage();
    const base = makeEdition({ id: 'edition-1' });
    const edition: Edition = {
        ...base,
        elements: {
            'deed.01': { photo: photo('photo-shown') },
        },
    };

    await storage.createEdition(edition);
    await storage.putPhoto(record('photo-shown', 'edition-1', 'shown'));
    await storage.putPhoto(record('photo-hidden', 'edition-1', 'hidden'));

    return { storage, edition };
}

describe('local edition for a job without an account (B80)', () => {
    it('gives the edition, the photos it shows and the frame of each', async () => {
        const { storage, edition } = await stored();
        const upload = await loadLocalEdition('edition-1', 'nl', storage);

        expect(upload?.edition).toEqual(edition);
        expect(Object.keys(upload?.photos ?? {})).toEqual(['photo-shown']);
        expect(await upload?.photos['photo-shown']?.text()).toBe('shown');
        expect(upload?.targets.printer['deed.01#photo']).toEqual({
            w: 57,
            h: 15.5,
        });
        expect(upload?.locale).toBe('nl');
    });

    it('takes the latest edition when there is no id, and none when the browser has none', async () => {
        const { storage } = await stored();

        expect(
            (await loadLocalEdition(null, 'nl', storage))?.edition,
        ).toMatchObject({
            id: 'edition-1',
        });
        expect(await loadLocalEdition('nope', 'nl', storage)).toBeNull();
        expect(
            await loadLocalEdition(null, 'nl', new MemoryEditionStorage()),
        ).toBeNull();
    });

    it('needs the photos on free layers, whatever the layout', () => {
        const edition: Edition = {
            ...makeEdition(),
            elements: {
                box_lid: {
                    layers: [
                        {
                            id: 'layer-1',
                            kind: 'photo',
                            photo: photo('on-layer'),
                            x: 0,
                            y: 0,
                            w: 50,
                            h: 50,
                        },
                    ],
                },
            },
        };

        expect(neededPhotoIds(edition, photoTargets(edition))).toEqual([
            'on-layer',
        ]);
    });

    it('sends the edition, the photos and the targets to the upload route', async () => {
        const { storage } = await stored();
        const upload = await loadLocalEdition('edition-1', 'nl', storage);
        const fetchMock = vi.fn(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        token: 'tok',
                        url: '/u',
                        statusUrl: '/s',
                    }),
                    { status: 201 },
                ),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        if (upload === null) {
            throw new Error('no upload');
        }

        await uploadPrintJob(upload, '/api/print-jobs');

        const calls = fetchMock.mock.calls as unknown as [
            string,
            RequestInit,
        ][];
        const body = calls[0]?.[1].body as FormData;

        expect(JSON.parse(body.get('edition') as string)).toMatchObject({
            id: 'edition-1',
        });
        expect(
            (JSON.parse(body.get('targets') as string) as PhotoTargets).printer,
        ).toHaveProperty('deed.01#photo');
        expect(body.get('photos[photo-shown]')).toBeInstanceOf(Blob);
        expect(body.get('photos[photo-hidden]')).toBeNull();
        vi.unstubAllGlobals();
    });
});
