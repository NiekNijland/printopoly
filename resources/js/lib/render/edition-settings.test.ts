import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { makeEdition, photo } from '../../testing/edition-test-utils';
import { setElement } from './edition-changes';
import { resolveEdition } from './edition-resolve';
import {
    changeBoardProfile,
    changeLanguage,
    changeTheme,
    rename,
} from './edition-settings';
import type { Edition } from './edition-types';

const withElements = (
    edition: Edition,
    entries: [string, Parameters<typeof setElement>[2]][],
): Edition => {
    return entries.reduce(
        (current, [key, override]) =>
            setElement(current, key, override).edition,
        edition,
    );
};

describe('changeLanguage', () => {
    it('keeps custom names and switches default texts', () => {
        const streets = [1, 3, 6, 8, 9, 11, 13, 14, 16, 18, 19, 21, 23, 24];
        const edition = withElements(
            makeEdition({ language: 'nl' }),
            streets.map((position): [string, { name: string }] => [
                `space.${String(position).padStart(2, '0')}`,
                { name: `Eigen ${position}` },
            ]),
        );
        const result = changeLanguage(edition, 'en');

        expect(result.edition.language).toBe('en');
        expect(Object.keys(result.edition.elements)).toHaveLength(14);
        const resolved = resolveEdition(result.edition);
        expect(resolved.spaces[1]?.name).toBe('Eigen 1');
        expect(resolved.spaces[2]?.name).toBe('Community Chest');
        expect(result.summary).toBe(
            'Taal naar English: je 14 eigen straatnamen blijven, de standaardteksten worden Engels.',
        );
        expect(result.changes).toEqual([]);
    });

    it('has the summary in the interface language', () => {
        const result = changeLanguage(makeEdition(), 'en', 'en');
        expect(result.summary).toBe(
            'Language to English: the default texts become English.',
        );
        expect(changeLanguage(makeEdition(), 'nl', 'nl').summary).toBe(
            'Taal naar Nederlands: de standaardteksten worden Nederlands.',
        );
    });

    it('counts a single name in the singular', () => {
        const edition = withElements(makeEdition(), [
            ['space.01', { name: 'A' }],
        ]);
        expect(changeLanguage(edition, 'en').summary).toContain(
            'je 1 eigen straatnaam blijft',
        );
    });

    it('moves the currency along only when it was the default of the old language', () => {
        expect(
            changeLanguage(makeEdition({ language: 'nl' }), 'en').edition
                .currency,
        ).toBe('gbp');
        // English editions from before B154 started with M; M still counts as their start currency.
        expect(
            changeLanguage(
                makeEdition({ language: 'en', currency: 'play' }),
                'nl',
            ).edition.currency,
        ).toBe('eur');
        expect(
            changeLanguage(
                makeEdition({ language: 'nl', currency: 'usd' }),
                'en',
            ).edition.currency,
        ).toBe('usd');
    });
});

describe('changeTheme', () => {
    it('only changes the theme and keeps every element', () => {
        const edition = withElements(makeEdition({ theme: 'classic' }), [
            ['space.01', { photo: photo() }],
            ['space.03', { name: 'A' }],
        ]);
        const result = changeTheme(edition, 'riso');

        expect(result.edition.theme).toBe('riso');
        expect(result.edition.elements).toEqual(edition.elements);
        expect(result.changes).toEqual([]);
        expect(result.summary).toBe('Thema naar Riso.');
    });
});

describe('changeBoardProfile', () => {
    it('keeps photo transforms (B61)', () => {
        const transform = {
            ...photo(),
            cx: 0.3,
            cy: 0.7,
            scale: 1.8,
            rotation: 90,
        };
        const edition = withElements(makeEdition(), [
            ['space.01', { photo: transform }],
        ]);
        const result = changeBoardProfile(edition, {
            ...DEFAULT_BOARD_PROFILE,
            id: 'custom',
            name: 'Eigen',
            outer: 508,
            corner: 72,
        });

        expect(result.edition.boardProfile.outer).toBe(508);
        expect(result.edition.elements['space.01']?.photo).toEqual(transform);
        expect(result.summary).toBe(
            "Andere bordmaat: foto's blijven op hun plek; het proefvel opnieuw printen.",
        );
        expect(
            changeBoardProfile(makeEdition(), DEFAULT_BOARD_PROFILE).summary,
        ).toBe('Andere bordmaat: print het proefvel opnieuw.');
    });
});

describe('rename', () => {
    it('trims the name', () => {
        expect(rename(makeEdition(), '  Nieuw  ').name).toBe('Nieuw');
    });
});
