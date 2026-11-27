import { describe, expect, it } from 'vitest';
import { setElement } from '../../lib/render/edition-changes';
import type { Edition } from '../../lib/render/edition-types';
import { makeEdition } from '../../testing/edition-test-utils';
import { summarizeDifference } from './summary';

const base = makeEdition();
const withKeys = (entries: [string, object][]): Edition =>
    entries.reduce(
        (edition, [key, override]) =>
            setElement(edition, key, override).edition,
        base,
    );
const changed = (keys: string[]): [string, object][] =>
    keys.map((key) => [key, { name: 'x', text: 'x' }]);
const summaryOf = (
    entries: [string, object][],
    language: 'nl' | 'en' = 'nl',
    settingsChanged = false,
) => {
    const next = withKeys(entries);

    return summarizeDifference(
        base,
        settingsChanged ? { ...next, theme: 'riso' } : next,
        language,
    );
};

describe('the summary of changed parts', () => {
    it('names a single space', () => {
        expect(summaryOf([['space.01', { name: 'Stadspark' }]])).toBe(
            'Stadspark aangepast',
        );
    });

    it('counts cards, deeds, notes and spaces', () => {
        expect(summaryOf(changed(['card.chance.01', 'card.chest.02']))).toBe(
            '2 kaarten aangepast',
        );
        expect(summaryOf(changed(['card.chance.01']))).toBe(
            '1 kaart aangepast',
        );
        expect(summaryOf(changed(['space.01', 'space.03', 'space.04']))).toBe(
            '3 vakken aangepast',
        );
        expect(summaryOf(changed(['deed.01', 'deed.02']))).toBe(
            '2 eigendomsbewijzen aangepast',
        );
        expect(summaryOf([['note.5', { color: '#FFFFFF' }]])).toBe(
            '1 biljet aangepast',
        );
        expect(summaryOf(changed(['pawn.01', 'pawn.02']))).toBe(
            '2 pionnen aangepast',
        );
    });

    it('joins several kinds', () => {
        expect(
            summaryOf(
                [
                    ['space.01', { name: 'Stadspark' }],
                    ...changed(['card.chance.01', 'box_lid']),
                ],
                'nl',
                true,
            ),
        ).toBe('Stadspark, 1 kaart, Doosdeksel en Instellingen aangepast');
        expect(
            summaryOf([
                ['space.01', { name: 'Stadspark' }],
                ...changed(['card.chance.01']),
            ]),
        ).toBe('Stadspark en 1 kaart aangepast');
    });

    it('speaks English', () => {
        expect(
            summaryOf(changed(['card.chance.01', 'card.chest.02']), 'en'),
        ).toBe('2 cards edited');
        expect(
            summaryOf(
                changed(['board_center', 'house_rules', 'card_back.chance']),
                'en',
            ),
        ).toBe('Board centre, House rules and Card backs edited');
    });

    it('ignores unknown keys', () => {
        expect(summaryOf(changed(['nonsense']))).toBe('');
    });
});

describe('summarizeDifference', () => {
    it('uses the new name of a single changed space', () => {
        expect(
            summarizeDifference(
                base,
                withKeys([['space.01', { name: 'Stadspark' }]]),
                'nl',
            ),
        ).toBe('Stadspark aangepast');
    });

    it('falls back to the standard name when a custom name was removed', () => {
        const before = withKeys([['space.01', { name: 'Stadspark' }]]);
        expect(summarizeDifference(before, base, 'nl')).toBe(
            'Molenweg aangepast',
        );
    });

    it('counts two cards', () => {
        const next = withKeys([
            ['card.chance.01', { text: 'a' }],
            ['card.chest.02', { text: 'b' }],
        ]);
        expect(summarizeDifference(base, next, 'nl')).toBe(
            '2 kaarten aangepast',
        );
    });

    it('mentions settings, and is empty without a difference', () => {
        expect(
            summarizeDifference(base, { ...base, theme: 'riso' }, 'nl'),
        ).toBe('Instellingen aangepast');
        expect(
            summarizeDifference(base, { ...base, name: 'Nieuw' }, 'en'),
        ).toBe('Settings edited');
        expect(summarizeDifference(base, base, 'nl')).toBe('');
    });
});
