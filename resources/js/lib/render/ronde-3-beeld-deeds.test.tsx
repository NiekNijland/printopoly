import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TitleDeed } from '@/components/render/title-deed';
import {
    deedCrop,
    deedPhotoOf,
    withDeedPhotos,
} from '@/lib/render/edition-deed-photos';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { clampTransform } from '@/lib/render/photos-transform';
import { deedsFor, spaceAt } from '@/lib/render/standard-edition';
import { makeEdition, photo } from '@/testing/edition-test-utils';

const base = { theme: 'classic', locale: 'nl' } as const;

const withElements = (elements: Edition['elements'], parts = {}): Edition => {
    const edition = makeEdition();

    return {
        ...edition,
        parts: { ...edition.parts, ...parts },
        elements,
    };
};

describe('the photo of a space on its title deed (B157)', () => {
    const street = deedsFor()[0];
    const station = deedsFor().find((space) => space.type === 'station');
    const stationDeed =
        station === undefined ? 0 : deedsFor().indexOf(station) + 1;

    it('shows the photo of the space by default, with its style', () => {
        const edition = withElements({
            'space.01': { photo: photo('p1'), photoStyle: 'full' },
        });

        expect(deedPhotoOf(edition, 1)).toMatchObject({
            from: 'space',
            photoStyle: 'full',
            photo: { photoId: 'p1' },
        });
        expect(resolveEdition(edition).deeds?.[0]?.photo?.photoId).toBe('p1');
        expect(street?.position).toBe(1);
    });

    it('keeps an own deed photo, and leaves the deed alone when the space says so', () => {
        const edition = withElements({
            'space.05': { photo: photo('p1') },
            [`deed.0${String(stationDeed)}`]: { photo: photo('own') },
            'space.03': { photo: photo('p3'), deedPhoto: false },
        });
        const resolved = resolveEdition(edition);

        expect(resolved.deeds?.[stationDeed - 1]).toMatchObject({
            photoFrom: 'deed',
            photo: { photoId: 'own' },
        });
        expect(resolved.deeds?.[1]?.photo).toBeUndefined();
    });

    it('writes the photo onto the deed for the print job, and nothing else', () => {
        const edition = withElements({
            'space.01': { photo: photo('p1') },
            'space.04': { photo: photo('tax') },
        });
        const printed = withDeedPhotos(edition);

        expect(printed.elements['deed.01']?.photo?.photoId).toBe('p1');
        expect(Object.keys(printed.elements).sort()).toEqual([
            'deed.01',
            'space.01',
            'space.04',
        ]);
        expect(withDeedPhotos(withElements({}))).toEqual(withElements({}));
    });
});

describe('a standing photo on the narrow frame of its title deed (B177)', () => {
    const standing = { width: 1200, height: 1600 };
    const frame = { w: 54, h: 16.5 };

    it('fills the strip with a standing photo, the face line a third down (B253, Kees)', () => {
        const edition = withElements({
            'space.01': { photo: { ...photo('p1'), cy: 1 / 3 } },
        });
        const borrowed = deedPhotoOf(edition, 1)?.photo;
        if (borrowed === undefined) {
            throw new Error('no deed photo');
        }
        expect(borrowed.borrowed).toBe(true);

        const crop = deedCrop(borrowed, standing, undefined);
        expect(crop).toMatchObject({ photoId: 'p1', scale: 1 });
        expect(crop.fit).toBeUndefined();
        expect(crop.borrowed).toBeUndefined();

        const source = { w: standing.width, h: standing.height };
        const t = clampTransform(
            source,
            {
                x: crop.cx,
                y: crop.cy,
                scale: crop.scale,
                rotation: 0,
                grayscale: false,
            },
            frame,
        );
        // Filled: the strip shows the full width of the photo and a band of its height around the face line.
        const shown = (frame.h / frame.w) * (standing.width / standing.height);
        expect((1 / 3 - (t.y - shown / 2)) / shown).toBeCloseTo(1 / 3, 5);
    });

    it('shows the upper part of a landscape photo on the strip, where faces are (R5-05)', () => {
        const wide = { width: 1600, height: 1200 };
        const crop = deedCrop(photo('p1'), wide, undefined);
        const strip = { w: 54, h: 16.5 };
        const t = clampTransform(
            { w: wide.width, h: wide.height },
            {
                x: crop.cx,
                y: crop.cy,
                scale: crop.scale,
                rotation: 0,
                grayscale: false,
            },
            strip,
        );
        const shown = (strip.h / strip.w) * (wide.width / wide.height);

        // The face line, a third from the top of the photo, is a third from the top of the strip.
        expect((1 / 3 - (t.y - shown / 2)) / shown).toBeCloseTo(1 / 3, 5);
        expect(crop.fit).toBeUndefined();
    });

    it('keeps the crop of a moved landscape photo, a photo that fits, or one of unknown size', () => {
        const placement = { ...photo('p1'), cy: 0.4 };

        expect(
            deedCrop(placement, { width: 1600, height: 900 }, undefined),
        ).toEqual(placement);
        expect(
            deedCrop({ ...placement, fit: true }, standing, undefined),
        ).toEqual({ ...placement, fit: true });
        expect(deedCrop(placement, undefined, undefined)).toEqual(placement);
        // A full-width photo gets the face line of its own, wider strip (B253).
        const full = deedCrop(photo('p1'), standing, 'full');
        expect(full.fit).toBeUndefined();
        expect(full.cy).not.toBe(0.5);
    });

    it('sends that crop to the print job, the space keeps its own', () => {
        const edition = withElements({
            'space.01': { photo: { ...photo('p1'), cy: 1 / 3 } },
        });
        const printed = withDeedPhotos(edition, new Map([['p1', standing]]));

        expect(printed.elements['deed.01']?.photo?.fit).toBeUndefined();
        expect(printed.elements['deed.01']?.photo?.cy).not.toBeCloseTo(1 / 3);
        expect(printed.elements['deed.01']?.photo?.borrowed).toBeUndefined();
        expect(printed.elements['space.01']?.photo?.cy).toBeCloseTo(1 / 3);
    });
});

describe('the story on a title deed (B169)', () => {
    it('prints on the back, between the mortgage and its text', () => {
        const space = spaceAt(1);
        if (space.type !== 'street') throw new Error('Street expected');
        const { container } = render(
            <TitleDeed
                {...base}
                space={space}
                side="back"
                story="Hier stond de bakkerij van opa."
            />,
        );

        expect(
            container.querySelector('[data-slot="story"]')?.textContent,
        ).toBe('Hier stond de bakkerij van opa.');
    });

    it('is resolved trimmed, and empty is none', () => {
        const edition = withElements({
            'deed.01': { text: '  Opa  ' },
            'deed.02': { text: ' ' },
        });
        const deeds = resolveEdition(edition).deeds;

        expect(deeds?.[0]?.story).toBe('Opa');
        expect(deeds?.[1]?.story).toBeUndefined();
    });
});
