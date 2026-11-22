import greatVibes400Latin from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2?url';
import greatVibes400LatinExt from '@fontsource/great-vibes/files/great-vibes-latin-ext-400-normal.woff2?url';
import plexMono400Latin from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url';
import plexMono400LatinExt from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-ext-400-normal.woff2?url';
import instrument400Latin from '@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2?url';
import instrument600Latin from '@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff2?url';
import instrument400LatinExt from '@fontsource/instrument-sans/files/instrument-sans-latin-ext-400-normal.woff2?url';
import instrument600LatinExt from '@fontsource/instrument-sans/files/instrument-sans-latin-ext-600-normal.woff2?url';
import spartan800Latin from '@fontsource/league-spartan/files/league-spartan-latin-800-normal.woff2?url';
import spartan800LatinExt from '@fontsource/league-spartan/files/league-spartan-latin-ext-800-normal.woff2?url';
import playfair700Latin from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2?url';
import playfair700LatinExt from '@fontsource/playfair-display/files/playfair-display-latin-ext-700-normal.woff2?url';

const LATIN =
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

interface FontFile {
    family: string;
    weight: string;
    url: string;
    range: string;
}

/** The fonts of the four themes (themes.ts), self-hosted through @fontsource (B75). */
const FILES: readonly FontFile[] = [
    {
        family: 'League Spartan',
        weight: '800',
        url: spartan800Latin,
        range: LATIN,
    },
    {
        family: 'League Spartan',
        weight: '800',
        url: spartan800LatinExt,
        range: LATIN_EXT,
    },
    {
        family: 'Instrument Sans',
        weight: '400',
        url: instrument400Latin,
        range: LATIN,
    },
    {
        family: 'Instrument Sans',
        weight: '400',
        url: instrument400LatinExt,
        range: LATIN_EXT,
    },
    {
        family: 'Instrument Sans',
        weight: '600',
        url: instrument600Latin,
        range: LATIN,
    },
    {
        family: 'Instrument Sans',
        weight: '600',
        url: instrument600LatinExt,
        range: LATIN_EXT,
    },
    {
        family: 'IBM Plex Mono',
        weight: '400',
        url: plexMono400Latin,
        range: LATIN,
    },
    {
        family: 'IBM Plex Mono',
        weight: '400',
        url: plexMono400LatinExt,
        range: LATIN_EXT,
    },
    {
        family: 'Playfair Display',
        weight: '700',
        url: playfair700Latin,
        range: LATIN,
    },
    {
        family: 'Playfair Display',
        weight: '700',
        url: playfair700LatinExt,
        range: LATIN_EXT,
    },
    {
        family: 'Great Vibes',
        weight: '400',
        url: greatVibes400Latin,
        range: LATIN,
    },
    {
        family: 'Great Vibes',
        weight: '400',
        url: greatVibes400LatinExt,
        range: LATIN_EXT,
    },
];

/**
 * Where a built asset can be fetched from by a page that has no origin: the print server answers with a
 * CORS header on `print-assets/build/...` only (B105), and Vite writes the font URLs as `/build/...`.
 */
function assetUrl(url: string, base: string | undefined): string {
    return base !== undefined && url.startsWith('/build/')
        ? `${base}/print-assets${url}`
        : url;
}

/**
 * Loads every font the themes use before anything is drawn, so text fitting measures with the real fonts
 * (B54, B55). Resolves when all are loaded; rejects when one cannot be fetched.
 */
export async function loadPrintFonts(base?: string): Promise<void> {
    const faces = FILES.map(
        (file) =>
            new FontFace(
                file.family,
                `url(${assetUrl(file.url, base)}) format('woff2')`,
                {
                    weight: file.weight,
                    style: 'normal',
                    unicodeRange: file.range,
                    display: 'block',
                },
            ),
    );

    await Promise.all(faces.map((face) => face.load()));

    for (const face of faces) {
        document.fonts.add(face);
    }

    await document.fonts.ready;
}
