import { heicHeader, pngHeader } from '@/testing/photos-test-fixtures';

import { prepareFriendPhoto } from './friend-photo';

const heic = vi.hoisted(() => ({
    heicTo: vi.fn<(options: { blob: Blob }) => Promise<Blob>>(),
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

describe('prepareFriendPhoto', () => {
    it('gives the upload, the preview and the size of a good photo', async () => {
        stubImages(1200, 900);
        const file = new File(
            [new Uint8Array(pngHeader(1200, 900))],
            'oma.png',
        );

        const result = await prepareFriendPhoto(file, 'nl');

        expect(result).toMatchObject({ ok: true, width: 1200, height: 900 });
        expect(result.ok && result.upload).toBe(file);
        expect(result.ok && result.preview.type).toBe('image/webp');
    });

    it('converts a HEIC photo from an iPhone to a JPEG and reports the stages', async () => {
        stubImages(4000, 3000);
        const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' });
        heic.heicTo.mockResolvedValue(jpeg);
        const stages: string[] = [];

        const result = await prepareFriendPhoto(
            new File(
                [new Uint8Array(heicHeader([{ w: 4000, h: 3000 }]))],
                'iphone.heic',
            ),
            'nl',
            (stage) => stages.push(stage),
        );

        expect(stages).toEqual(['converting', 'resizing']);
        expect(result.ok && result.upload).toBe(jpeg);
    });

    it('says in Dutch why a file cannot be used', async () => {
        const result = await prepareFriendPhoto(
            new File(['hello'], 'notes.txt'),
            'nl',
        );

        expect(result).toEqual({
            ok: false,
            message: 'notes.txt kan niet: kies een JPEG, PNG, WebP of HEIC.',
        });
    });

    it('says it in English for an English box', async () => {
        const result = await prepareFriendPhoto(
            new File(['hello'], 'notes.txt'),
            'en',
        );

        expect(result).toEqual({
            ok: false,
            message:
                "notes.txt can't be used: choose a JPEG, PNG, WebP or HEIC.",
        });
    });
});
