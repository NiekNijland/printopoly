import { assert, describe, expect, it, vi } from 'vitest';
import {
    preparePhoto,
    previewSize,
    type DecodedBitmap,
    type PhotoInput,
    type PreviewDeps,
} from './preview';
import { gifHeader, heicHeader, jpegHeader, pngHeader } from './test-fixtures';

describe('previewSize', () => {
    it('scales the long side to 1600 px and keeps the aspect ratio', () => {
        expect(previewSize({ w: 4000, h: 3000 })).toEqual({ w: 1600, h: 1200 });
        expect(previewSize({ w: 3000, h: 6000 })).toEqual({ w: 800, h: 1600 });
    });

    it('never enlarges', () => {
        expect(previewSize({ w: 800, h: 600 })).toEqual({ w: 800, h: 600 });
        expect(previewSize({ w: 1600, h: 900 })).toEqual({ w: 1600, h: 900 });
    });
});

function input(bytes: Uint8Array, name: string): PhotoInput {
    return Object.assign(new Blob([bytes as BlobPart]), { name });
}

function fakeDeps(
    width = 4000,
    height = 3000,
): PreviewDeps & { closed: () => boolean } {
    let closed = false;
    const bitmap: DecodedBitmap = {
        width,
        height,
        close: () => void (closed = true),
    };
    return {
        decodeHeic: vi.fn(() =>
            Promise.resolve(new Blob(['jpeg'], { type: 'image/jpeg' })),
        ),
        decodeBitmap: vi.fn(() => Promise.resolve(bitmap)),
        encodeWebp: vi.fn(() =>
            Promise.resolve(new Blob(['webp'], { type: 'image/webp' })),
        ),
        closed: () => closed,
    };
}

describe('preparePhoto', () => {
    it('validates, makes a 1600 px WebP preview and closes the bitmap', async () => {
        const deps = fakeDeps();
        const stages: string[] = [];
        const result = await preparePhoto(
            input(jpegHeader(4000, 3000), 'a.jpg'),
            deps,
            (s) => stages.push(s),
        );
        assert(result.ok);
        expect(result.previewSize).toEqual({ w: 1600, h: 1200 });
        expect(result.size).toEqual({ w: 4000, h: 3000 });
        expect(result.preview.type).toBe('image/webp');
        expect(deps.encodeWebp).toHaveBeenCalledWith(
            expect.anything(),
            { w: 1600, h: 1200 },
            0.85,
        );
        expect(deps.decodeHeic).not.toHaveBeenCalled();
        expect(stages).toEqual(['resizing']);
        expect(deps.closed()).toBe(true);
    });

    it('converts HEIC first and uploads the converted blob', async () => {
        const deps = fakeDeps();
        const stages: string[] = [];
        const result = await preparePhoto(
            input(heicHeader([{ w: 4032, h: 3024 }]), 'kelder.heic'),
            deps,
            (s) => stages.push(s),
        );
        expect(stages).toEqual(['converting', 'resizing']);
        expect(result.ok && result.upload.type).toBe('image/jpeg');
        expect(result.ok && result.format).toBe('heic');
    });

    it('returns the validation error and decodes nothing', async () => {
        const deps = fakeDeps();
        const result = await preparePhoto(input(gifHeader(), 'a.gif'), deps);
        expect(result).toMatchObject({
            ok: false,
            error: { code: 'unsupported-type' },
        });
        expect(deps.decodeBitmap).not.toHaveBeenCalled();
    });

    it('turns decoder failures into an unreadable-file error', async () => {
        const deps = fakeDeps();
        vi.mocked(deps.decodeBitmap).mockRejectedValueOnce(new Error('broken'));
        expect(
            await preparePhoto(input(pngHeader(10, 10), 'a.png'), deps),
        ).toMatchObject({ ok: false, error: { code: 'unreadable' } });

        const heic = fakeDeps();
        vi.mocked(heic.decodeHeic).mockRejectedValueOnce(new Error('no codec'));
        expect(
            await preparePhoto(
                input(heicHeader([{ w: 10, h: 10 }]), 'a.heic'),
                heic,
            ),
        ).toMatchObject({
            ok: false,
            error: { code: 'unreadable' },
        });
    });

    it('rechecks the pixel count after decoding and still closes the bitmap', async () => {
        const deps = fakeDeps(12000, 9000);
        const result = await preparePhoto(
            input(pngHeader(100, 100), 'liar.png'),
            deps,
        );
        expect(result).toMatchObject({
            ok: false,
            error: { code: 'too-many-pixels' },
        });
        expect(deps.closed()).toBe(true);
    });
});
