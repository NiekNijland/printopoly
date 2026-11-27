import { installMemoryServices } from '@/testing/editions';
import { heicHeader, pngHeader } from '@/testing/photos-test-fixtures';

import { decodeHeic, ingestPhoto } from './ingest';

const heic = vi.hoisted(() => ({
    heicTo: vi.fn<
        (options: {
            blob: Blob;
            type: string;
            quality: number;
        }) => Promise<Blob>
    >(),
}));

vi.mock('heic-to', () => heic);

const stubImages = (width: number, height: number): void => {
    vi.stubGlobal(
        'createImageBitmap',
        vi.fn(() => Promise.resolve({ width, height, close: () => undefined })),
    );
    vi.stubGlobal(
        'OffscreenCanvas',
        class {
            getContext() {
                return { drawImage: () => undefined };
            }
            convertToBlob() {
                return Promise.resolve(
                    new Blob(['webp'], { type: 'image/webp' }),
                );
            }
        },
    );
};

const png = (name = 'strand.png'): File =>
    new File([new Uint8Array(pngHeader(800, 600))], name, {
        type: 'image/png',
    });

const quotaError = (): Error => {
    const error = new Error('full');
    error.name = 'QuotaExceededError';

    return error;
};

describe('ingestPhoto', () => {
    it('stores a good photo with its preview and gives back the record', async () => {
        stubImages(800, 600);
        const { repository } = installMemoryServices();
        const stages: string[] = [];

        const result = await ingestPhoto(
            png(),
            repository,
            'edition-1',
            (stage) => stages.push(stage),
        );

        expect(stages).toEqual(['resizing']);
        expect(result).toMatchObject({
            ok: true,
            record: {
                editionId: 'edition-1',
                width: 800,
                height: 600,
                fileName: 'strand.png',
            },
        });
        const record = result.ok ? result.record : undefined;
        expect(record?.preview?.type).toBe('image/webp');
        expect(await repository.getPhoto(record?.id ?? '')).toEqual(record);
    });

    it('converts a HEIC photo with the given decoder first', async () => {
        stubImages(4000, 3000);
        const { repository } = installMemoryServices();
        const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' });
        const decode = vi.fn<(blob: Blob) => Promise<Blob>>(() =>
            Promise.resolve(jpeg),
        );
        const stages: string[] = [];

        const result = await ingestPhoto(
            new File(
                [new Uint8Array(heicHeader([{ w: 4000, h: 3000 }]))],
                'iphone.heic',
            ),
            repository,
            'edition-1',
            (stage) => stages.push(stage),
            decode,
        );

        expect(stages).toEqual(['converting', 'resizing']);
        expect(result.ok && result.record.blob).toBe(jpeg);
    });

    it('gives back the error of a file that is no photo, and stores nothing', async () => {
        const { repository, storage } = installMemoryServices();

        const result = await ingestPhoto(
            new File(['hello'], 'notes.txt'),
            repository,
            'edition-1',
        );

        expect(result).toMatchObject({
            ok: false,
            error: { code: 'unsupported-type', fileName: 'notes.txt' },
        });
        expect(await storage.listPhotos('edition-1')).toEqual([]);
    });

    it('says the storage is full when the browser refuses the photo', async () => {
        stubImages(800, 600);
        const { repository, storage } = installMemoryServices();
        vi.spyOn(storage, 'putPhoto').mockRejectedValue(quotaError());

        expect(await ingestPhoto(png('vol.png'), repository, 'e')).toEqual({
            ok: false,
            storageFull: true,
            fileName: 'vol.png',
        });
    });

    it('says the storage is full when the stored photo cannot be read back', async () => {
        stubImages(800, 600);
        const { repository, storage } = installMemoryServices();
        vi.spyOn(storage, 'getPhoto').mockResolvedValue(undefined);

        expect(await ingestPhoto(png('weg.png'), repository, 'e')).toEqual({
            ok: false,
            storageFull: true,
            fileName: 'weg.png',
        });
    });

    it('lets any other storage error through', async () => {
        stubImages(800, 600);
        const { repository, storage } = installMemoryServices();
        vi.spyOn(storage, 'putPhoto').mockRejectedValue(new Error('broken'));

        await expect(ingestPhoto(png(), repository, 'e')).rejects.toThrow(
            'broken',
        );
    });
});

describe('decodeHeic', () => {
    it('turns a HEIC blob into a JPEG with the converter', async () => {
        const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' });
        heic.heicTo.mockResolvedValue(jpeg);
        const source = new Blob(['heic']);

        expect(await decodeHeic(source)).toBe(jpeg);
        expect(heic.heicTo).toHaveBeenCalledExactlyOnceWith({
            blob: source,
            type: 'image/jpeg',
            quality: 0.92,
        });
    });
});
