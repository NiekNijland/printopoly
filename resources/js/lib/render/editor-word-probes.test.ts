import { describe, expect, it } from 'vitest';

import { WORD_IDS } from './edition-keys';
import { WORD_PROBES } from './editor-word-probes';
import { deedsFor, standardEdition } from './standard-edition';

describe('WORD_PROBES', () => {
    it('has probes for every word', () => {
        expect(Object.keys(WORD_PROBES).sort()).toEqual([...WORD_IDS].sort());
        for (const id of WORD_IDS) {
            expect(WORD_PROBES[id].length).toBeGreaterThan(0);
        }
    });

    it('draws the first deed and the cards that carry the house word', () => {
        const [deed, ...cards] = WORD_PROBES.house;

        expect(deed).toEqual({
            key: 'deed.01',
            part: 'deeds',
            place: { nl: 'de eigendomsbewijzen', en: 'the title deeds' },
        });
        expect(cards.length).toBeGreaterThan(0);
        for (const probe of cards) {
            const [, deck, number] = probe.key.split('.');
            const card =
                deck === 'chance' || deck === 'chest'
                    ? standardEdition.decks[deck][Number(number) - 1]
                    : undefined;

            expect(probe.part).toBe('cards');
            expect(card?.text.nl).toContain('{house}');
        }
    });

    it('checks the currency on a street, the tax, a deed and the note of 500', () => {
        expect(WORD_PROBES.currency.map((probe) => probe.key)).toEqual([
            'space.01',
            'space.04',
            'deed.01',
            'note.500',
        ]);
        expect(WORD_PROBES.currency[0]?.place.en).toBe('the board');
        expect(WORD_PROBES.bank).toEqual([
            {
                key: 'note.500',
                part: 'money',
                place: { nl: 'het speelgeld', en: 'the play money' },
            },
        ]);
    });

    it('checks each deck on its space, its first card and its back', () => {
        expect(WORD_PROBES.chance.map((probe) => probe.key)).toEqual([
            'space.07',
            'card.chance.01',
            'card_back.chance',
        ]);
        expect(WORD_PROBES.chest.map((probe) => probe.part)).toEqual([
            'board',
            'cards',
            'cards',
        ]);
    });

    it('checks stations and utilities on the deed of the first one', () => {
        const station = deedsFor().findIndex(
            (space) => space.type === 'station',
        );
        const utility = deedsFor().findIndex(
            (space) => space.type === 'utility',
        );

        expect(WORD_PROBES.station[0]?.key).toBe(
            `deed.${String(station + 1).padStart(2, '0')}`,
        );
        expect(WORD_PROBES.utility[0]?.key).toBe(
            `deed.${String(utility + 1).padStart(2, '0')}`,
        );
    });
});
