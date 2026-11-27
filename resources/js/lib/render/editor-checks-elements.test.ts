import { describe, expect, it } from 'vitest';

import { updateElement } from '@/lib/render/edition-changes';
import type { Edition } from '@/lib/render/edition-types';
import { makeEdition, photo } from '@/testing/edition-test-utils';

import { measuredElements, wordProbes } from './editor-checks-elements';
import type { ProbeResult } from './editor-checks-input';
import type { PhotoInfos } from './editor-photo-cache';

const withOverride = (
    edition: Edition,
    key: string,
    patch: Parameters<typeof updateElement>[2],
): Edition => updateElement(edition, key, patch).edition;

const photos: PhotoInfos = new Map([
    ['p1', { id: 'p1', url: 'blob:p1', width: 400, height: 300 }],
]);

describe('editor-checks-elements', () => {
    it('turns a probed photo and text into a check element', () => {
        const edition = withOverride(makeEdition(), 'space.01', {
            name: 'Dorpsplein',
            photo: photo('p1'),
        });
        const probes = new Map<string, ProbeResult>([
            [
                'space.01',
                {
                    frame: { w: 20, h: 15 },
                    texts: [{ fits: false, overflowChars: 3, fontMm: 1 }],
                },
            ],
        ]);
        const [space] = measuredElements(edition, edition, probes, photos);

        expect(space?.key).toBe('space.01');
        expect(space?.photos?.[0]).toMatchObject({
            field: 'photo',
            source: { w: 400, h: 300 },
            frame: { w: 20, h: 15 },
        });
        expect(space?.texts).toEqual([
            {
                field: 'name',
                fit: { fits: false, excessCharacters: 3 },
                fontMm: 1,
            },
        ]);
    });

    it('leaves out an element the probe did not draw', () => {
        const edition = withOverride(makeEdition(), 'space.01', {
            name: 'Dorpsplein',
        });

        expect(measuredElements(edition, edition, new Map(), photos)).toEqual(
            [],
        );
    });

    it('blames a word that does not fit on the word', () => {
        const edition = withOverride(makeEdition(), 'words.house', {
            name: 'Een heel erg lang woord voor een huis',
        });
        const [probe] = wordProbes(edition);
        const probes = new Map<string, ProbeResult>([
            [
                probe?.key ?? '',
                { frame: null, texts: [{ fits: false, overflowChars: 9 }] },
            ],
        ]);
        const elements = measuredElements(edition, edition, probes, photos);

        expect(elements.at(-1)).toMatchObject({
            key: 'words.house',
            texts: [
                { field: 'name', fit: { fits: false, excessCharacters: 9 } },
            ],
        });
    });

    it('probes only the words the edition changed', () => {
        expect(wordProbes(makeEdition())).toEqual([]);
        expect(
            wordProbes(
                withOverride(makeEdition(), 'words.house', { name: 'Hut' }),
            ).every((probe) => probe.id === 'house'),
        ).toBe(true);
    });
});
