import type { PhotoFormat } from '../../../types/photos';
import type { Size } from '../../../types/print';

/** The brands HEIC files use. AVIF and other ISO base media files are refused. */
const HEIC_BRANDS = new Set([
    'heic',
    'heix',
    'heim',
    'heis',
    'hevc',
    'hevx',
    'hevm',
    'hevs',
]);
const HEIF_GENERIC_BRANDS = new Set(['mif1', 'msf1']);

const ascii = (b: Uint8Array, offset: number, length: number): string => {
    let s = '';
    for (let i = 0; i < length; i++)
        s += String.fromCharCode(b[offset + i] ?? 0);
    return s;
};

const u16be = (b: Uint8Array, o: number): number => {
    return ((b[o] ?? 0) << 8) | (b[o + 1] ?? 0);
};

const u16le = (b: Uint8Array, o: number): number => {
    return (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8);
};

const u24le = (b: Uint8Array, o: number): number => {
    return (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8) | ((b[o + 2] ?? 0) << 16);
};

const u32be = (b: Uint8Array, o: number): number => {
    return (
        (b[o] ?? 0) * 0x1000000 +
        (((b[o + 1] ?? 0) << 16) | ((b[o + 2] ?? 0) << 8) | (b[o + 3] ?? 0))
    );
};

/** Detects the format from the first bytes only. The extension and MIME type are ignored (B69). */
export const detectFormat = (b: Uint8Array): PhotoFormat | null => {
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
        return 'jpeg';
    if (
        b.length >= 8 &&
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
            (v, i) => b[i] === v,
        )
    )
        return 'png';
    if (
        b.length >= 12 &&
        ascii(b, 0, 4) === 'RIFF' &&
        ascii(b, 8, 4) === 'WEBP'
    )
        return 'webp';
    if (b.length >= 16 && ascii(b, 4, 4) === 'ftyp') {
        const boxSize = u32be(b, 0);
        const end = Math.min(b.length, boxSize >= 16 ? boxSize : 16);
        const major = ascii(b, 8, 4);
        const compatible: string[] = [];
        for (let o = 16; o + 4 <= end; o += 4) compatible.push(ascii(b, o, 4));
        if (HEIC_BRANDS.has(major)) return 'heic';
        if (
            HEIF_GENERIC_BRANDS.has(major) &&
            compatible.some((c) => HEIC_BRANDS.has(c))
        )
            return 'heic';
    }
    return null;
};

const jpegSize = (b: Uint8Array): Size | null => {
    let i = 2;
    while (i + 4 <= b.length) {
        if (b[i] !== 0xff) {
            i++;
            continue;
        }
        const marker = b[i + 1] ?? 0;
        if (marker === 0xff) {
            i++; // fill byte
            continue;
        }
        if (
            marker === 0x01 ||
            marker === 0xd8 ||
            (marker >= 0xd0 && marker <= 0xd7)
        ) {
            i += 2; // markers without a length
            continue;
        }
        if (marker === 0xd9 || marker === 0xda) return null; // the frame header has to come first
        const length = u16be(b, i + 2);
        if (length < 2) return null;
        const isFrame =
            marker >= 0xc0 &&
            marker <= 0xcf &&
            marker !== 0xc4 &&
            marker !== 0xc8 &&
            marker !== 0xcc;
        if (isFrame) {
            if (i + 9 > b.length) return null;
            const h = u16be(b, i + 5);
            const w = u16be(b, i + 7);
            return w > 0 && h > 0 ? { w, h } : null;
        }
        i += 2 + length;
    }
    return null;
};

const pngSize = (b: Uint8Array): Size | null => {
    if (b.length < 24 || ascii(b, 12, 4) !== 'IHDR') return null;
    const w = u32be(b, 16);
    const h = u32be(b, 20);
    return w > 0 && h > 0 ? { w, h } : null;
};

const webpSize = (b: Uint8Array): Size | null => {
    const chunk = ascii(b, 12, 4);
    if (chunk === 'VP8 ') {
        if (b.length < 30 || b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a)
            return null;
        const w = u16le(b, 26) & 0x3fff;
        const h = u16le(b, 28) & 0x3fff;
        return w > 0 && h > 0 ? { w, h } : null;
    }
    if (chunk === 'VP8L') {
        if (b.length < 25 || b[20] !== 0x2f) return null;
        const b1 = b[21] ?? 0;
        const b2 = b[22] ?? 0;
        const b3 = b[23] ?? 0;
        const b4 = b[24] ?? 0;
        return {
            w: 1 + (b1 | ((b2 & 0x3f) << 8)),
            h: 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10)),
        };
    }
    if (chunk === 'VP8X') {
        if (b.length < 30) return null;
        return { w: 1 + u24le(b, 24), h: 1 + u24le(b, 27) };
    }
    return null;
};

type Box = {
    type: string;
    /** Start and end of the box contents. */
    start: number;
    end: number;
};

const boxes = function* boxes(
    b: Uint8Array,
    from: number,
    to: number,
): Generator<Box> {
    let o = from;
    while (o + 8 <= to) {
        let size = u32be(b, o);
        let header = 8;
        if (size === 1) {
            if (o + 16 > to || u32be(b, o + 8) !== 0) return; // 64-bit sizes above 4 GB are not photos
            size = u32be(b, o + 12);
            header = 16;
        } else if (size === 0) {
            size = to - o;
        }
        if (size < header) return;
        yield {
            type: ascii(b, o + 4, 4),
            start: o + header,
            end: Math.min(to, o + size),
        };
        o += size;
    }
};

/** Largest `ispe` (image spatial extents) in `meta/iprp/ipco`: the main image, not a thumbnail. */
const heicSize = (b: Uint8Array): Size | null => {
    let best: Size | null = null;
    for (const meta of boxes(b, 0, b.length)) {
        if (meta.type !== 'meta') continue;
        for (const iprp of boxes(b, meta.start + 4, meta.end)) {
            if (iprp.type !== 'iprp') continue;
            for (const ipco of boxes(b, iprp.start, iprp.end)) {
                if (ipco.type !== 'ipco') continue;
                for (const ispe of boxes(b, ipco.start, ipco.end)) {
                    if (ispe.type !== 'ispe' || ispe.end - ispe.start < 12)
                        continue;
                    const w = u32be(b, ispe.start + 4);
                    const h = u32be(b, ispe.start + 8);
                    if (w > 0 && h > 0 && (!best || w * h > best.w * best.h))
                        best = { w, h };
                }
            }
        }
    }
    return best;
};

/** Pixel size read from the header, without decoding. Null when the header is damaged or cut off. */
export const readDimensions = (
    b: Uint8Array,
    format: PhotoFormat,
): Size | null => {
    switch (format) {
        case 'jpeg':
            return jpegSize(b);
        case 'png':
            return pngSize(b);
        case 'webp':
            return webpSize(b);
        case 'heic':
            return heicSize(b);
    }
};
