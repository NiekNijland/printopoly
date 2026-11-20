import { describe, expect, it } from 'vitest';
import { gifHeader, heicHeader, jpegHeader, pngHeader, svgHeader, tiffHeader } from './test-fixtures';
import { formatPhotoError, MAX_FILE_BYTES, validatePhoto } from './validation';

const file = (name: string, size = 1_000_000) => ({ name, size });

describe('validatePhoto', () => {
    it('accepts a normal JPEG and returns its size', () => {
        expect(validatePhoto(file('a.jpg'), jpegHeader(4000, 3000))).toEqual({ ok: true, format: 'jpeg', width: 4000, height: 3000 });
    });

    it('accepts HEIC', () => {
        const result = validatePhoto(file('kelder.heic'), heicHeader([{ w: 4032, h: 3024 }]));
        expect(result).toMatchObject({ ok: true, format: 'heic' });
    });

    it('judges by content: a .jpg that is really a GIF is refused, a .txt that is a PNG is fine', () => {
        const gif = validatePhoto(file('strand.jpg'), gifHeader());
        expect(gif).toMatchObject({ ok: false, error: { code: 'unsupported-type' } });
        expect(validatePhoto(file('notes.txt'), pngHeader(100, 100))).toMatchObject({ ok: true, format: 'png' });
    });

    it('refuses TIFF and SVG with the design text', () => {
        const tiff = validatePhoto(file('vakantie.tiff'), tiffHeader());
        expect(tiff.ok).toBe(false);
        if (!tiff.ok) {
            expect(formatPhotoError(tiff.error, 'nl')).toBe('vakantie.tiff kan niet: kies een JPEG, PNG, WebP of HEIC.');
            expect(formatPhotoError(tiff.error, 'en')).toBe("vakantie.tiff can't be used: choose a JPEG, PNG, WebP or HEIC.");
        }
        expect(validatePhoto(file('a.svg'), svgHeader())).toMatchObject({ ok: false, error: { code: 'unsupported-type' } });
    });

    it('refuses files over 25 MB with the design text', () => {
        const result = validatePhoto(file('strand.jpg', MAX_FILE_BYTES + 1), jpegHeader(4000, 3000));
        expect(result).toMatchObject({ ok: false, error: { code: 'too-large' } });
        if (!result.ok) {
            expect(formatPhotoError(result.error, 'nl')).toBe('strand.jpg is groter dan 25 MB. Kies een kleinere versie.');
            expect(formatPhotoError(result.error, 'en')).toBe('strand.jpg is larger than 25 MB. Choose a smaller version.');
        }
    });

    it('allows exactly 25 MB', () => {
        expect(validatePhoto(file('a.jpg', MAX_FILE_BYTES), jpegHeader(100, 100)).ok).toBe(true);
    });

    it('checks the pixel count from the header: 60 MP passes, one more pixel row fails', () => {
        expect(validatePhoto(file('a.png'), pngHeader(10000, 6000)).ok).toBe(true);
        expect(validatePhoto(file('a.png'), pngHeader(10000, 6001))).toMatchObject({ ok: false, error: { code: 'too-many-pixels' } });
        expect(validatePhoto(file('a.jpg'), jpegHeader(12000, 9000))).toMatchObject({ ok: false, error: { code: 'too-many-pixels' } });
    });

    it('refuses empty and damaged files', () => {
        expect(validatePhoto(file('a.jpg', 0), new Uint8Array())).toMatchObject({ ok: false, error: { code: 'unreadable' } });
        expect(validatePhoto(file('a.jpg'), jpegHeader(10, 10).slice(0, 8))).toMatchObject({ ok: false, error: { code: 'unreadable' } });
    });
});
