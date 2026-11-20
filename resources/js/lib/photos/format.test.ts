import { describe, expect, it } from 'vitest';
import { detectFormat, readDimensions } from './format';
import {
    avifHeader,
    gifHeader,
    heicHeader,
    jpegHeader,
    pngHeader,
    svgHeader,
    tiffHeader,
    webpExtendedHeader,
    webpLosslessHeader,
    webpLossyHeader,
} from './test-fixtures';

describe('detectFormat', () => {
    it('recognises the four allowed formats by their bytes', () => {
        expect(detectFormat(jpegHeader(10, 10))).toBe('jpeg');
        expect(detectFormat(pngHeader(10, 10))).toBe('png');
        expect(detectFormat(webpLossyHeader(10, 10))).toBe('webp');
        expect(detectFormat(heicHeader([{ w: 10, h: 10 }]))).toBe('heic');
    });

    it('accepts a generic HEIF brand when a HEIC brand is compatible', () => {
        expect(detectFormat(heicHeader([{ w: 10, h: 10 }], 'mif1'))).toBe('heic');
    });

    it('refuses AVIF, GIF, TIFF, SVG and empty input', () => {
        for (const bytes of [avifHeader(), gifHeader(), tiffHeader(), svgHeader(), new Uint8Array()]) {
            expect(detectFormat(bytes)).toBeNull();
        }
    });
});

describe('readDimensions', () => {
    it('reads JPEG from SOF0, also behind an EXIF block and fill bytes', () => {
        expect(readDimensions(jpegHeader(4000, 3000, 300), 'jpeg')).toEqual({ w: 4000, h: 3000 });
    });

    it('reads progressive JPEG (SOF2)', () => {
        expect(readDimensions(jpegHeader(8000, 6000, 20, 0xc2), 'jpeg')).toEqual({ w: 8000, h: 6000 });
    });

    it('returns null for a JPEG cut off before the frame header', () => {
        expect(readDimensions(jpegHeader(100, 100).slice(0, 12), 'jpeg')).toBeNull();
    });

    it('reads PNG from IHDR', () => {
        expect(readDimensions(pngHeader(1920, 1080), 'png')).toEqual({ w: 1920, h: 1080 });
    });

    it('reads the three WebP flavours', () => {
        expect(readDimensions(webpLossyHeader(1234, 567), 'webp')).toEqual({ w: 1234, h: 567 });
        expect(readDimensions(webpLosslessHeader(1234, 567), 'webp')).toEqual({ w: 1234, h: 567 });
        expect(readDimensions(webpExtendedHeader(16000, 9000), 'webp')).toEqual({ w: 16000, h: 9000 });
    });

    it('reads HEIC and takes the largest ispe, not the thumbnail', () => {
        const heic = heicHeader([
            { w: 320, h: 240 },
            { w: 4032, h: 3024 },
        ]);
        expect(readDimensions(heic, 'heic')).toEqual({ w: 4032, h: 3024 });
    });

    it('returns null for broken headers', () => {
        expect(readDimensions(pngHeader(1, 1).slice(0, 14), 'png')).toBeNull();
        expect(readDimensions(webpLossyHeader(1, 1).slice(0, 20), 'webp')).toBeNull();
        expect(readDimensions(new Uint8Array([0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70]), 'heic')).toBeNull();
    });
});
