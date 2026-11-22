import { describe, expect, it } from 'vitest';

import { makeEdition, photo } from '@/lib/edition/test-utils';

import { photoKindOf } from './photo-batch';
import { planPhotoChoice } from './photo-match';

const order = (key: string) => ({ key, how: 'order' });

describe('several photos at once (bug 7, ronde 4)', () => {
    it('knows streets, stations and cards apart, and leaves corners and the centre out', () => {
        expect(photoKindOf('space.01')).toBe('space:street');
        expect(photoKindOf('space.05')).toBe('space:station');
        expect(photoKindOf('card.chance.03')).toBe('card');
        expect(photoKindOf('space.10')).toBeNull();
        expect(photoKindOf('board_center')).toBeNull();
    });

    it('fills only empty elements of the same kind after the first photo', () => {
        const edition = makeEdition();
        const withPhoto = {
            ...edition,
            elements: { ...edition.elements, 'space.03': { photo: photo() } },
        };
        // 02 Community Chest, 03 a street with a photo, 04 tax, 05 a station, 06 a street, 10 the jail corner.
        const plan = planPhotoChoice(
            withPhoto,
            'space.01',
            [
                'space.02',
                'space.03',
                'space.04',
                'space.05',
                'space.06',
                'space.10',
            ],
            ['a.jpg', 'b.jpg', 'c.jpg'],
            [],
        );

        expect(plan.targets).toEqual([
            order('space.01'),
            order('space.06'),
            null,
        ]);
        expect(plan.skipped).toBe(4);
    });

    it('lets one photo go on the element that is open, whatever it is', () => {
        const plan = planPhotoChoice(
            makeEdition(),
            'space.10',
            ['space.11'],
            ['a.jpg'],
            [],
        );

        expect(plan.targets).toEqual([order('space.10')]);
        expect(plan.skipped).toBe(0);
    });
});
