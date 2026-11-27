import { describe, expect, it } from 'vitest';

import { elementLabel } from '@/lib/render/editor-catalogue';
import { makeEdition, photo } from '@/testing/edition-test-utils';

import { nameCandidates, planPhotoChoice } from './editor-photo-match';

const label = (edition: ReturnType<typeof makeEdition>) => (key: string) =>
    elementLabel(key, edition, 'nl');

const matchPhotosByName = (
    fileNames: readonly string[],
    candidates: readonly { key: string; label: string }[],
): (string | null)[] =>
    planPhotoChoice(makeEdition(), null, [], fileNames, candidates).targets.map(
        (target) => target?.key ?? null,
    );

const match = (fileName: string, ...labels: string[]): string | null =>
    matchPhotosByName(
        [fileName],
        labels.map((name, index) => ({
            key: `k${String(index)}`,
            label: name,
        })),
    )[0] ?? null;

describe('photos matched by file name (B237)', () => {
    it('ignores case, accents, separators and the extension', () => {
        expect(
            match('Kroonpléin_Oost-zijde.jpg', 'Kroonplein Oost zijde'),
        ).toBe('k0');
        expect(match('bakker_jansen.JPG', 'Bakker', 'Bakker Jansen')).toBe(
            'k1',
        );
        expect(match('BakkerJansen.heic', 'Bakker', 'Bakker Jansen')).toBe(
            'k1',
        );
        expect(match('Café de Zon.jpg', 'De Zon', 'Cafe De Zon')).toBe('k1');
    });

    it('finds the name inside a longer file name, and a part of a long name', () => {
        expect(match('Raadhuisplein (1).jpg', 'Raadhuisplein')).toBe('k0');
        expect(
            match('Domplein 2026.jpg', 'Het Domplein 2026 feest', 'Domplein'),
        ).toBe('k1');
        expect(match('scheve toren.jpg', 'De kerk met de scheve toren')).toBe(
            'k0',
        );
    });

    it('forgives a small typo and nothing more', () => {
        expect(match('Kasteelaan.jpg', 'Kasteellaan')).toBe('k0');
        expect(match('kapper.jpg', 'Kapsalon Knip')).toBeNull();
        expect(match('IMG_4021.jpg', 'Kerkstraat')).toBeNull();
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
