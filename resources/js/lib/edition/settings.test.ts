import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { setElement } from './changes';
import { resolveEdition } from './resolve';
import {
    changeBoardProfile,
    changeCurrency,
    changeLanguage,
    changeTheme,
    customizedPerPart,
    rename,
    setPart,
} from './settings';
import { makeEdition, photo } from './test-utils';
import type { Edition } from './types';

function withElements(
    edition: Edition,
    entries: [string, Parameters<typeof setElement>[2]][],
): Edition {
    return entries.reduce(
        (current, [key, override]) =>
            setElement(current, key, override).edition,
        edition,
    );
}

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
        expect(changeCurrency(makeEdition(), 'gbp').currency).toBe('gbp');
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

describe('setPart', () => {
    const base = withElements(makeEdition(), [
        ['note.5', { photo: photo('a') }],
        ['note.10', { photo: photo('b') }],
        ['space.01', { name: 'A' }],
    ]);

    it('keeps the overrides when a part goes off and when it comes back (B99)', () => {
        const on = setPart(base, 'money', true);
        expect(on.edition.parts.money).toBe(true);
        const off = setPart(on.edition, 'money', false);
        expect(off.edition.parts.money).toBe(false);
        expect(off.edition.elements).toEqual(base.elements);
        expect(off.summary).toBe(
            'Speelgeld overslaan: je 2 aangepaste biljetten blijven bewaard en komen terug als je het weer aanzet.',
        );
        expect(resolveEdition(off.edition).money).toBeNull();
        expect(
            resolveEdition(
                setPart(off.edition, 'money', true).edition,
            ).money?.notes.filter((note) => note.customized),
        ).toHaveLength(2);
    });

    it('uses the singular, and a short sentence without overrides', () => {
        const one = withElements(makeEdition(), [
            ['note.5', { photo: photo() }],
        ]);
        expect(setPart(one, 'money', false).summary).toBe(
            'Speelgeld overslaan: je 1 aangepaste biljet blijft bewaard en komt terug als je het weer aanzet.',
        );
        expect(setPart(makeEdition(), 'deeds', false).summary).toBe(
            'Eigendomsbewijzen overslaan: je kunt het later weer aanzetten.',
        );
    });

    it('says what comes back when a part is switched on', () => {
        expect(setPart(base, 'money', true).summary).toBe(
            'Speelgeld weer aan: je 2 aangepaste biljetten zijn terug.',
        );
        expect(setPart(makeEdition(), 'pawns', true, 'en').summary).toBe(
            'Pawns on again.',
        );
        expect(setPart(base, 'money', false, 'en').summary).toBe(
            'Skip play money: your 2 edited notes are kept and come back when you turn it on again.',
        );
    });

    it('does not allow the board to be skipped', () => {
        expect(() => setPart(base, 'board', false)).toThrow(RangeError);
        expect(setPart(base, 'board', true).edition.parts.board).toBe(true);
    });

    it('counts overrides per part', () => {
        expect(customizedPerPart(base)).toMatchObject({
            board: 1,
            money: 2,
            deeds: 0,
        });
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
