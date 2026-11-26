/** Tiny header-only byte arrays for tests. They are not decodable images. */

function bytes(...parts: (number | string | number[])[]): Uint8Array {
    const out: number[] = [];
    for (const p of parts) {
        if (typeof p === 'number') out.push(p);
        else if (typeof p === 'string')
            for (const c of p) out.push(c.charCodeAt(0));
        else out.push(...p);
    }
    return new Uint8Array(out);
}

const u16be = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const u16le = (n: number) => [n & 0xff, (n >> 8) & 0xff];
const u24le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
const u32be = (n: number) => [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
];

/** JPEG: SOI, an APP1 block of `exifBytes`, a DQT-like block, then SOF0 and SOS. */
export function jpegHeader(
    w: number,
    h: number,
    exifBytes = 20,
    sof = 0xc0,
): Uint8Array {
    return bytes(
        [0xff, 0xd8],
        [0xff, 0xe1],
        u16be(exifBytes + 2),
        new Array<number>(exifBytes).fill(0x45),
        [0xff, 0xff], // fill bytes
        [0xff, sof],
        u16be(17),
        8,
        u16be(h),
        u16be(w),
        3,
        [1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1],
        [0xff, 0xda],
        u16be(12),
    );
}

export function pngHeader(w: number, h: number): Uint8Array {
    return bytes(
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        u32be(13),
        'IHDR',
        u32be(w),
        u32be(h),
        [8, 6, 0, 0, 0],
    );
}

export function webpLossyHeader(w: number, h: number): Uint8Array {
    return bytes(
        'RIFF',
        [0x30, 0, 0, 0],
        'WEBP',
        'VP8 ',
        [0x20, 0, 0, 0],
        [0x10, 0x02, 0x00],
        [0x9d, 0x01, 0x2a],
        u16le(w),
        u16le(h),
    );
}

export function webpLosslessHeader(w: number, h: number): Uint8Array {
    const wm = w - 1;
    const hm = h - 1;
    return bytes(
        'RIFF',
        [0x30, 0, 0, 0],
        'WEBP',
        'VP8L',
        [0x20, 0, 0, 0],
        0x2f,
        [
            wm & 0xff,
            ((wm >> 8) & 0x3f) | ((hm & 0x03) << 6),
            (hm >> 2) & 0xff,
            (hm >> 10) & 0x0f,
        ],
    );
}

export function webpExtendedHeader(w: number, h: number): Uint8Array {
    return bytes(
        'RIFF',
        [0x30, 0, 0, 0],
        'WEBP',
        'VP8X',
        [10, 0, 0, 0],
        [0, 0, 0, 0],
        u24le(w - 1),
        u24le(h - 1),
    );
}

function box(type: string, ...content: (number[] | Uint8Array)[]): number[] {
    const body = content.flatMap((c) => Array.from(c));
    return [
        ...u32be(8 + body.length),
        ...Array.from(type, (c) => c.charCodeAt(0)),
        ...body,
    ];
}

/** HEIC: ftyp, then meta with iprp/ipco holding one `ispe` per given size (thumbnails first). */
export function heicHeader(
    sizes: { w: number; h: number }[],
    major = 'heic',
): Uint8Array {
    const ispes = sizes.map((s) =>
        box('ispe', [0, 0, 0, 0], u32be(s.w), u32be(s.h)),
    );
    const ipco = box('ipco', ...ispes);
    const iprp = box('iprp', ipco);
    const meta = box(
        'meta',
        [0, 0, 0, 0],
        box(
            'hdlr',
            [0, 0, 0, 0, 0, 0, 0, 0],
            Array.from('pict', (c) => c.charCodeAt(0)),
            new Array<number>(12).fill(0),
        ),
        iprp,
    );
    const ftyp = box(
        'ftyp',
        Array.from(major, (c) => c.charCodeAt(0)),
        u32be(0),
        Array.from('mif1heic', (c) => c.charCodeAt(0)),
    );
    return new Uint8Array([...ftyp, ...meta]);
}

export function avifHeader(): Uint8Array {
    const ftyp = box(
        'ftyp',
        Array.from('avif', (c) => c.charCodeAt(0)),
        u32be(0),
        Array.from('avifmif1', (c) => c.charCodeAt(0)),
    );
    return new Uint8Array(ftyp);
}

export function gifHeader(): Uint8Array {
    return bytes('GIF89a', [1, 0, 1, 0]);
}

export function tiffHeader(): Uint8Array {
    return bytes('II', [42, 0, 8, 0, 0, 0]);
}

export function svgHeader(): Uint8Array {
    return bytes(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
    );
}
