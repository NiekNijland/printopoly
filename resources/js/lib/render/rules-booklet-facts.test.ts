import { standardEdition } from '@/lib/render/standard-edition';

import { DEFAULT_WORDS, type RulesContext } from './rules-booklet';
import {
    JAIL_FINE,
    bookletFacts,
    capitalize,
    list,
    plain,
    startSplit,
    stations,
    streets,
    taxes,
    utilities,
} from './rules-booklet-facts';

const ctx = (locale: 'nl' | 'en'): RulesContext => ({
    locale,
    currency: 'eur',
    name: 'Ons Dorp',
    words: DEFAULT_WORDS[locale],
    spaceNames: [],
    houseRules: [],
});

describe('the facts of the rules booklet', () => {
    it('writes plain numbers and lists in the language', () => {
        expect(plain(1500, 'nl')).toBe('1.500');
        expect(plain(1500, 'en')).toBe('1,500');
        expect(list(['a', 'b', 'c'], 'nl')).toBe('a, b en c');
        expect(list(['a'], 'en')).toBe('a');
        expect(capitalize('station')).toBe('Station');
        expect(JAIL_FINE).toBe(50);
    });

    it('picks the spaces of each kind from the standard board', () => {
        expect(streets()).toHaveLength(22);
        expect(stations()).toHaveLength(4);
        expect(utilities()).toHaveLength(2);
        expect(taxes()).toHaveLength(2);
    });

    it('splits the start money in the order of the standard data', () => {
        const first = standardEdition.money.startingCash.split[0];

        expect(startSplit(ctx('nl'))).toMatch(
            new RegExp(`^${String(first?.count)} × `),
        );
    });

    it('builds the cover, the back and the blocks of a chapter', () => {
        const facts = bookletFacts(ctx('en'));

        expect(facts.cover).toEqual({
            kind: 'cover',
            title: 'Ons Dorp',
            subtitle: 'How to play',
        });
        expect(facts.back.line).toBe('Have fun playing');
        expect(facts.players).toBe(8);
        expect(facts.cards).toEqual({ chance: 16, chest: 16 });
        expect(facts.text(3, 'T', [facts.p('x')])).toEqual({
            kind: 'text',
            kicker: 'Chapter 3',
            title: 'T',
            blocks: [{ type: 'p', text: 'x' }],
        });
        expect(facts.items(['a'], true)).toEqual({
            type: 'list',
            items: ['a'],
            numbered: true,
        });
        expect(facts.tip('t')).toEqual({ type: 'tip', text: 't' });
    });
});
