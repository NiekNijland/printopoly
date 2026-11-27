import { pagePayload } from './print-payload';

const profile = {
    id: 'classic',
    name: 'Klassiek',
    outer: 500,
    corner: 66,
    border: 8,
    panels: 4,
    boxLid: { w: 260, h: 260 },
};

const edition = {
    name: 'Buurtfeest',
    language: 'nl',
    theme: 'classic',
    currency: 'eur',
    boardProfile: profile,
    parts: { board: true, money: false },
    moneyAmount: null,
    sets: 1,
    boardForm: 'panels',
    elements: { 'space.01': { name: 'Beukenlaan', src: '/x.jpg' } },
};

const print = {
    part: 'cards',
    set: 'printer',
    pageShaveMm: 0.05,
    assetBase: 'http://127.0.0.1/build',
    edition,
};

const share = {
    part: 'share',
    set: 'printer',
    pageShaveMm: 0.5,
    labels: { kicker: 'Onze eigen editie', footer: 'printopoly.nl' },
    edition: { language: 'nl', elements: {} },
    photos: [
        { id: 'p1', src: 'data:image/jpeg;base64,AAAA', width: 4, height: 3 },
    ],
};

const reads = (value: unknown): boolean => pagePayload(value).ok;

describe('pagePayload', () => {
    it('reads a part of a print set and the share picture', () => {
        expect(pagePayload(print)).toEqual({ ok: true, value: print });
        expect(pagePayload(share)).toEqual({ ok: true, value: share });
        expect(reads({ ...print, edition: { elements: {} } })).toBe(true);
        expect(reads({ ...print, extra: 1 })).toBe(true);
    });

    it('refuses a payload that misses a field', () => {
        const { pageShaveMm: _, ...withoutShave } = print;
        const { labels: __, ...withoutLabels } = share;

        expect(reads(withoutShave)).toBe(false);
        expect(reads(withoutLabels)).toBe(false);
        expect(reads({ ...print, edition: { name: 'x' } })).toBe(false);
        expect(reads(undefined)).toBe(false);
    });

    it('refuses a payload with a field of the wrong type', () => {
        expect(reads({ ...print, part: 'dice' })).toBe(false);
        expect(reads({ ...print, set: 'shop' })).toBe(false);
        expect(reads({ ...share, set: 'home' })).toBe(false);
        expect(reads({ ...print, edition: { ...edition, sets: '2' } })).toBe(
            false,
        );
        expect(
            reads({
                ...print,
                edition: {
                    ...edition,
                    boardProfile: { ...profile, panels: 3 },
                },
            }),
        ).toBe(false);
        expect(
            reads({
                ...print,
                edition: { ...edition, parts: { board: 'yes' } },
            }),
        ).toBe(false);
        expect(reads({ ...print, edition: { ...edition, elements: [] } })).toBe(
            false,
        );
        expect(
            reads({ ...share, photos: [{ id: 'p1', src: 'x', width: '4' }] }),
        ).toBe(false);
    });
});
