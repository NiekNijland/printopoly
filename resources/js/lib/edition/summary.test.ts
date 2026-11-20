import { describe, expect, it } from 'vitest';
import { setElement } from './changes';
import { summarizeDifference, summarizeKeys } from './summary';
import { makeEdition } from './test-utils';
import type { Edition } from './types';

const base = makeEdition();
const withKeys = (entries: [string, object][]): Edition =>
    entries.reduce((edition, [key, override]) => setElement(edition, key, override).edition, base);

describe('summarizeKeys', () => {
    it('names a single space', () => {
        expect(summarizeKeys(['space.01'], false, 'nl', () => 'Stadspark')).toBe('Stadspark aangepast');
    });

    it('counts cards, deeds, notes and spaces', () => {
        expect(summarizeKeys(['card.chance.01', 'card.chest.02'], false, 'nl')).toBe('2 kaarten aangepast');
        expect(summarizeKeys(['card.chance.01'], false, 'nl')).toBe('1 kaart aangepast');
        expect(summarizeKeys(['space.01', 'space.03', 'space.04'], false, 'nl')).toBe('3 vakken aangepast');
        expect(summarizeKeys(['deed.01', 'deed.02'], false, 'nl')).toBe('2 eigendomsbewijzen aangepast');
        expect(summarizeKeys(['note.5'], false, 'nl')).toBe('1 biljet aangepast');
        expect(summarizeKeys(['pawn.01', 'pawn.02'], false, 'nl')).toBe('2 pionnen aangepast');
    });

    it('joins several kinds', () => {
        expect(summarizeKeys(['space.01', 'card.chance.01', 'box_lid'], true, 'nl', () => 'Stadspark')).toBe(
            'Stadspark, 1 kaart, Doosdeksel en Instellingen aangepast',
        );
        expect(summarizeKeys(['space.01', 'card.chance.01'], false, 'nl', () => 'Stadspark')).toBe(
            'Stadspark en 1 kaart aangepast',
        );
    });

    it('speaks English', () => {
        expect(summarizeKeys(['card.chance.01', 'card.chest.02'], false, 'en')).toBe('2 cards edited');
        expect(summarizeKeys(['board_center', 'house_rules', 'card_back.chance'], false, 'en')).toBe(
            'Board centre, House rules and Card backs edited',
        );
    });

    it('falls back to the key when the name is unknown and ignores unknown keys', () => {
        expect(summarizeKeys(['space.01'], false, 'nl')).toBe('space.01 aangepast');
        expect(summarizeKeys(['nonsense'], false, 'nl')).toBe('');
    });
});

describe('summarizeDifference', () => {
    it('uses the new name of a single changed space', () => {
        expect(summarizeDifference(base, withKeys([['space.01', { name: 'Stadspark' }]]), 'nl')).toBe(
            'Stadspark aangepast',
        );
    });

    it('falls back to the standard name when a custom name was removed', () => {
        const before = withKeys([['space.01', { name: 'Stadspark' }]]);
        expect(summarizeDifference(before, base, 'nl')).toBe('Molenweg aangepast');
    });

    it('counts two cards', () => {
        const next = withKeys([
            ['card.chance.01', { text: 'a' }],
            ['card.chest.02', { text: 'b' }],
        ]);
        expect(summarizeDifference(base, next, 'nl')).toBe('2 kaarten aangepast');
    });

    it('mentions settings, and is empty without a difference', () => {
        expect(summarizeDifference(base, { ...base, theme: 'riso' }, 'nl')).toBe('Instellingen aangepast');
        expect(summarizeDifference(base, { ...base, name: 'Nieuw' }, 'en')).toBe('Settings edited');
        expect(summarizeDifference(base, base, 'nl')).toBe('');
    });
});
