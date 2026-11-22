import { describe, expect, it } from 'vitest';

import { applyChanges } from '@/lib/edition/changes';
import { makeEdition, photo } from '@/lib/edition/test-utils';
import type { Edition } from '@/lib/edition/types';

import {
    canSwapPhoto,
    photoSwapChanges,
    photoSwapTargets,
    swapsPhoto,
} from './photo-swap';

function withElements(elements: Edition['elements']): Edition {
    const edition = makeEdition();

    return { ...edition, elements: { ...edition.elements, ...elements } };
}

describe('photos between spaces (B238)', () => {
    it('lets streets, stations and utilities trade photos, not corners or card spaces', () => {
        expect(swapsPhoto('space.01')).toBe(true);
        expect(swapsPhoto('space.05')).toBe(true);
        expect(swapsPhoto('space.12')).toBe(true);
        expect(swapsPhoto('space.00')).toBe(false);
        expect(swapsPhoto('space.02')).toBe(false);
        expect(swapsPhoto('pawn.01')).toBe(false);
        expect(photoSwapTargets('space.01')).toContain('space.05');
        expect(photoSwapTargets('space.01')).not.toContain('space.01');
        expect(photoSwapTargets('space.00')).toEqual([]);
    });

    it('trades two photos and keeps the names and amounts where they are', () => {
        const edition = withElements({
            'space.01': {
                name: 'Bakker',
                photo: photo('a'),
                photoStyle: 'full',
            },
            'space.03': {
                name: 'Slager',
                photo: photo('b'),
                amounts: { price: 70 },
            },
        });
        const changes = photoSwapChanges(edition, 'space.01', 'space.03');
        const after = applyChanges(edition, changes);

        expect(changes).toHaveLength(2);
        expect(after.elements['space.01']).toEqual({
            name: 'Bakker',
            photo: photo('b'),
        });
        expect(after.elements['space.03']).toEqual({
            name: 'Slager',
            photo: photo('a'),
            photoStyle: 'full',
            amounts: { price: 70 },
        });
    });

    it('moves a photo to a space without one, and takes the place of its own icon', () => {
        const edition = withElements({
            'space.01': { photo: photo('a') },
            'space.05': { icon: { preset: 'train' } },
        });
        const after = applyChanges(
            edition,
            photoSwapChanges(edition, 'space.01', 'space.05'),
        );

        expect(after.elements['space.01']).toBeUndefined();
        expect(after.elements['space.05']).toEqual({ photo: photo('a') });
    });

    it('does nothing without a photo on either side', () => {
        const edition = withElements({ 'space.01': { name: 'Bakker' } });

        expect(photoSwapChanges(edition, 'space.01', 'space.03')).toEqual([]);
        expect(canSwapPhoto(edition, 'space.01')).toBe(false);
        expect(
            canSwapPhoto(
                withElements({ 'space.01': { photo: photo() } }),
                'space.01',
            ),
        ).toBe(true);
    });
});
