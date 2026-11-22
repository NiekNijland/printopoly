import { describe, expect, it } from 'vitest';

import { makeEdition, photo } from '@/lib/edition/test-utils';
import { elementLabel } from '@/lib/editor/catalogue';

import {
    matchPhotosByName,
    nameCandidates,
    nameScore,
    normalizeName,
    planPhotoChoice,
} from './photo-match';

const label = (edition: ReturnType<typeof makeEdition>) => (key: string) =>
    elementLabel(key, edition, 'nl');

describe('photos matched by file name (B237)', () => {
    it('ignores case, accents, separators and the extension', () => {
        expect(normalizeName('Kroonpléin_Oost-zijde')).toBe(
            'kroonplein oost zijde',
        );
        expect(nameScore('bakker_jansen.JPG', 'Bakker Jansen')).toBe(1);
        expect(nameScore('BakkerJansen.heic', 'Bakker Jansen')).toBe(1);
        expect(nameScore('Café de Zon.jpg', 'Cafe De Zon')).toBe(1);
    });

    it('finds the name inside a longer file name, and a part of a long name', () => {
        expect(nameScore('Raadhuisplein (1).jpg', 'Raadhuisplein')).toBe(0.9);
        expect(nameScore('Domplein 2026.jpg', 'Domplein')).toBe(0.9);
        expect(
            nameScore('scheve toren.jpg', 'De kerk met de scheve toren'),
        ).toBe(0.85);
    });

    it('forgives a small typo and nothing more', () => {
        expect(nameScore('Kasteelaan.jpg', 'Kasteellaan')).toBeGreaterThan(0.8);
        expect(nameScore('kapper.jpg', 'Kapsalon Knip')).toBeLessThan(0.8);
        expect(nameScore('IMG_4021.jpg', 'Kerkstraat')).toBeLessThan(0.8);
    });

    it('puts each file on one space and never guesses between two', () => {
        const candidates = [
            { key: 'space.05', label: 'Station Noord' },
            { key: 'space.15', label: 'Station Oost' },
            { key: 'space.06', label: 'Kerkstraat' },
        ];

        expect(
            matchPhotosByName(
                ['station.jpg', 'kerkstraat.jpg', 'Kerkstraat (2).jpg'],
                candidates,
            ),
        ).toEqual([null, 'space.06', null]);
    });

    it('offers the named spaces and the pawns in the set, not corners or emptied names', () => {
        const base = makeEdition();
        const edition = {
            ...base,
            elements: {
                ...base.elements,
                'space.03': { name: '' },
                'pawn.02': { hidden: true },
            },
        };
        const keys = nameCandidates(edition, label(edition)).map(
            (candidate) => candidate.key,
        );

        expect(keys).toContain('space.01');
        expect(keys).toContain('space.05');
        expect(keys).toContain('pawn.01');
        expect(keys).not.toContain('space.00');
        expect(keys).not.toContain('space.02');
        expect(keys).not.toContain('space.03');
        expect(keys).not.toContain('pawn.02');
    });

    it('places named files first, then fills empty spaces from the open one in order', () => {
        const base = makeEdition();
        const edition = {
            ...base,
            elements: { ...base.elements, 'space.39': { photo: photo() } },
        };
        const plan = planPhotoChoice(
            edition,
            'space.01',
            ['space.03', 'space.06'],
            ['Kroonplein.jpg', 'IMG_1.jpg', 'IMG_2.jpg'],
            nameCandidates(edition, label(edition)),
        );

        expect(plan.targets).toEqual([
            { key: 'space.39', how: 'name' },
            { key: 'space.01', how: 'order' },
            { key: 'space.03', how: 'order' },
        ]);
    });

    it('does not fill the open space in order when a file is named after it', () => {
        const edition = makeEdition();
        const plan = planPhotoChoice(
            edition,
            'space.01',
            ['space.03'],
            ['IMG_1.jpg', 'molenweg.jpg'],
            nameCandidates(edition, label(edition)),
        );

        expect(plan.targets).toEqual([
            { key: 'space.03', how: 'order' },
            { key: 'space.01', how: 'name' },
        ]);
    });

    it('leaves a file without a matching name unplaced from the list', () => {
        const edition = makeEdition();
        const plan = planPhotoChoice(
            edition,
            null,
            [],
            ['Marktplein.jpg', 'IMG_1.jpg'],
            nameCandidates(edition, label(edition)),
        );

        expect(plan.targets).toEqual([{ key: 'space.18', how: 'name' }, null]);
    });

    it('matches a single file from the list too, but not one chosen on a space', () => {
        const edition = makeEdition();
        const candidates = nameCandidates(edition, label(edition));

        expect(
            planPhotoChoice(edition, null, [], ['marktplein.png'], candidates)
                .targets,
        ).toEqual([{ key: 'space.18', how: 'name' }]);
        expect(
            planPhotoChoice(
                edition,
                'space.01',
                [],
                ['marktplein.png'],
                candidates,
            ).targets,
        ).toEqual([{ key: 'space.01', how: 'order' }]);
    });
});
