import { describe, expect, it } from 'vitest';

import { makeEdition, photo } from '@/testing/edition-test-utils';

import { buildCheckInput } from './editor-checks-input';
import { photoBleed } from './editor-photo-bleed';

describe('photoBleed', () => {
    it('is zero for a framed photo', () => {
        expect(photoBleed('deed.01', undefined)).toBe(0);
        expect(photoBleed('deed.01', 'framed')).toBe(0);
    });

    it('is the printed bleed of the element for a full photo', () => {
        expect(photoBleed('deed.01', 'full')).toBe(3);
        expect(photoBleed('card.chance.01', 'full')).toBe(3);
        expect(photoBleed('box_lid', 'full')).toBe(3);
        expect(photoBleed('space.01', 'full')).toBe(2.5);
        expect(photoBleed('note.5', 'full')).toBe(0);
        expect(photoBleed('pawn.01', 'full')).toBe(0);
    });
});

describe('the resolution check of a full photo', () => {
    const photos = new Map([
        ['p1', { id: 'p1', url: 'x', width: 4000, height: 3000 }],
    ]);
    const probes = new Map([
        ['deed.01', { frame: { w: 63, h: 36 }, texts: [] }],
    ]);

    it('measures against the frame with its bleed', () => {
        const edition = {
            ...makeEdition(),
            elements: {
                'deed.01': { photo: photo(), photoStyle: 'full' as const },
            },
        };
        const input = buildCheckInput(edition, probes, photos);

        expect(input.elements[0]?.photos?.[0]).toMatchObject({
            frame: { w: 63, h: 36 },
            bleed: 3,
        });
    });

    it('has no bleed for a framed photo', () => {
        const edition = {
            ...makeEdition(),
            elements: { 'deed.01': { photo: photo() } },
        };
        const input = buildCheckInput(edition, probes, photos);

        expect(input.elements[0]?.photos?.[0]?.bleed).toBe(0);
    });
});
