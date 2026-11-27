import { loadPrintFonts } from './fonts';

type Descriptors = { weight?: string; unicodeRange?: string; display?: string };

const created: { family: string; source: string; descriptors: Descriptors }[] =
    [];

const stubFonts = (fails = false) => {
    created.length = 0;
    const added: string[] = [];
    const ready = vi.fn<() => void>();
    vi.stubGlobal(
        'FontFace',
        class {
            constructor(
                readonly family: string,
                source: string,
                descriptors: Descriptors,
            ) {
                created.push({ family, source, descriptors });
            }
            load() {
                return fails && this.family === 'Great Vibes'
                    ? Promise.reject(new Error('404'))
                    : Promise.resolve(this);
            }
        },
    );
    Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: {
            add: (face: { family: string }) => added.push(face.family),
            get ready() {
                ready();

                return Promise.resolve();
            },
        },
    });

    return { added, ready };
};

describe('loadPrintFonts', () => {
    it('loads every font of the themes, Latin and Latin Extended, and adds them to the page', async () => {
        const { added, ready } = stubFonts();

        await loadPrintFonts();

        expect(created).toHaveLength(12);
        expect(new Set(added)).toEqual(
            new Set([
                'League Spartan',
                'Instrument Sans',
                'IBM Plex Mono',
                'Playfair Display',
                'Great Vibes',
            ]),
        );
        expect(added).toHaveLength(12);
        expect(ready).toHaveBeenCalledTimes(1);
        expect(
            created
                .filter((face) => face.family === 'Instrument Sans')
                .map((face) => face.descriptors.weight),
        ).toEqual(['400', '400', '600', '600']);
        expect(created[0]?.descriptors.display).toBe('block');
        expect(created[0]?.descriptors.unicodeRange).toContain('U+20AC');
        expect(created[1]?.descriptors.unicodeRange).toMatch(/^U\+0100-02BA/);
        expect(created[0]?.source).toMatch(
            /^url\(.*league-spartan-latin-800-normal\.woff2.*\) format\('woff2'\)$/,
        );
    });

    it('fetches the files from the page itself when they are not built assets', async () => {
        stubFonts();

        await loadPrintFonts('https://print.example.test');

        expect(
            created.every(
                (face) => !face.source.includes('https://print.example.test'),
            ),
        ).toBe(true);
    });

    it('adds no font when one cannot be fetched', async () => {
        const { added } = stubFonts(true);

        await expect(loadPrintFonts()).rejects.toThrow('404');

        expect(added).toEqual([]);
    });
});
