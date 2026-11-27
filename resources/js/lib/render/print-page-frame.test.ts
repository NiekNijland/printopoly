import type { PageSpec } from './print-composition';
import { BLEED, perSet, setsOf, withCropMarks } from './print-page-frame';

const page = (): PageSpec => ({
    size: { w: 69, h: 94 },
    label: 'Kaart',
    cropMarks: [],
    foldLines: [],
    items: [
        {
            id: 'card.0',
            kind: 'card',
            elementKey: null,
            label: '',
            bleed: { x: 0, y: 0, w: 69, h: 94 },
            trim: { x: BLEED, y: BLEED, w: 63, h: 88 },
        },
    ],
});

describe('print-page-frame', () => {
    it('counts one to forty sets (B242)', () => {
        expect(setsOf({})).toBe(1);
        expect(setsOf({ sets: 0 })).toBe(1);
        expect(setsOf({ sets: 3.7 })).toBe(3);
        expect(setsOf({ sets: 99 })).toBe(40);
        expect(setsOf({ sets: Number.NaN })).toBe(1);
    });

    it('repeats the pages for every set with its set mark (B242)', () => {
        expect(perSet(1, () => [page()])).toEqual([page()]);
        const two = perSet(2, () => [page()]);
        expect(two.map((p) => p.label)).toEqual([
            'Kaart · SET 1',
            'Kaart · SET 2',
        ]);
        expect(two[1]?.items[0]?.setNumber).toBe(2);
    });

    it('grows a print-shop page by the room for crop marks outside the bleed (B160)', () => {
        const marked = withCropMarks(page());

        expect(marked.size).toEqual({ w: 69 + 2 * 6, h: 94 + 2 * 6 });
        expect(marked.items[0]?.trim).toEqual({
            x: BLEED + 6,
            y: BLEED + 6,
            w: 63,
            h: 88,
        });
        expect(marked.cropMarks.length).toBeGreaterThan(0);
    });
});
