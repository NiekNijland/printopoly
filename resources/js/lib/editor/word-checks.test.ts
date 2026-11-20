import { describe, expect, it } from 'vitest';

import { runChecks } from '@/lib/checks/checks';
import { setElement } from '@/lib/edition/changes';
import { wordKey } from '@/lib/edition/keys';
import { makeEdition } from '@/lib/edition/test-utils';
import { DEFAULT_PARTS, type Edition } from '@/lib/edition/types';

import { elementLabel } from './catalogue';
import { deckLabel } from './catalogue';
import { buildCheckInput, probeKeys, type Probes } from './checks-input';

function withWord(
    edition: Edition,
    id: Parameters<typeof wordKey>[0],
    override: { name?: string; text?: string },
): Edition {
    return setElement(edition, wordKey(id), override).edition;
}

describe('Controle for custom words', () => {
    const cardsAndDeeds = {
        ...DEFAULT_PARTS,
        deeds: true,
        cards: true,
        money: true,
    };

    it('draws the elements that show a custom word, and nothing for a standard one', () => {
        const standard = makeEdition({ parts: cardsAndDeeds });

        expect(probeKeys(standard)).toEqual([]);
        expect(
            probeKeys(
                withWord(standard, 'house', { name: 'Schuurtje' }),
            ).sort(),
        ).toEqual(['card.chance.11', 'card.chest.14', 'deed.01']);
        expect(
            probeKeys(withWord(standard, 'chance', { name: 'Roddel' })).sort(),
        ).toEqual(['card.chance.01', 'card_back.chance', 'space.07']);
        expect(
            probeKeys(withWord(standard, 'currency', { text: 'RP' })).sort(),
        ).toEqual(['deed.01', 'note.500', 'space.01', 'space.04']);
    });

    it('leaves out the elements of a part that is off', () => {
        const off = { deeds: false, cards: false };

        expect(
            probeKeys(
                withWord(makeEdition({ parts: off }), 'house', {
                    name: 'Schuurtje',
                }),
            ),
        ).toEqual([]);
        expect(
            probeKeys(
                withWord(makeEdition({ parts: off }), 'chance', {
                    name: 'Roddel',
                }),
            ),
        ).toEqual(['space.07']);
    });

    it('does not draw the words themselves', () => {
        const edition = withWord(makeEdition(), 'jail', {
            name: 'de Strafbank',
        });

        expect(probeKeys(edition)).not.toContain('words.jail');
    });

    it('blames a word that does not fit, once per place, and says where', () => {
        const edition = withWord(
            makeEdition({ parts: cardsAndDeeds }),
            'house',
            { name: 'een heel lang woord voor een klein huis' },
        );
        const overflow = {
            frame: null,
            texts: [{ fits: false, overflowChars: 7 }],
        };
        const probes: Probes = new Map([
            ['deed.01', overflow],
            ['card.chance.11', overflow],
            ['card.chest.14', overflow],
        ]);
        const issues = runChecks(buildCheckInput(edition, probes, new Map()));

        expect(issues.map((issue) => issue.elementKey)).toEqual([
            'words.house',
            'words.house',
        ]);
        expect(new Set(issues.map((issue) => issue.id)).size).toBe(2);
        expect(issues[0]?.message.nl).toBe(
            'Dit woord past niet op de eigendomsbewijzen, ook niet in de kleinste letter. Haal ongeveer 7 tekens weg.',
        );
        expect(issues[1]?.message.en).toContain(
            "This word doesn't fit on the cards",
        );
    });

    it('blames the text, not the word, when the element has a text of its own', () => {
        const edition = setElement(
            withWord(makeEdition({ parts: cardsAndDeeds }), 'house', {
                name: 'Schuurtje',
            }),
            'card.chance.11',
            { text: 'Een veel te lange tekst' },
        ).edition;
        const probes: Probes = new Map([
            [
                'card.chance.11',
                { frame: null, texts: [{ fits: false, overflowChars: 3 }] },
            ],
        ]);
        const issues = runChecks(buildCheckInput(edition, probes, new Map()));

        expect(issues.map((issue) => issue.elementKey)).toEqual([
            'card.chance.11',
        ]);
    });

    it('stays quiet when the words fit', () => {
        const edition = withWord(
            makeEdition({ parts: cardsAndDeeds }),
            'hotel',
            { name: 'Boerderij' },
        );
        const fits = { frame: null, texts: [{ fits: true, overflowChars: 0 }] };
        const probes: Probes = new Map([
            ['deed.01', fits],
            ['card.chance.11', fits],
            ['card.chest.14', fits],
        ]);

        expect(runChecks(buildCheckInput(edition, probes, new Map()))).toEqual(
            [],
        );
    });
});

describe('labels of the words in the editor', () => {
    it('names the decks with the edition words in lists and labels', () => {
        const edition = withWord(makeEdition(), 'chance', { name: 'Roddel' });

        expect(deckLabel(edition, 'chance', 'nl')).toBe('Roddel');
        expect(deckLabel(edition, 'chest', 'nl')).toBe('Algemeen Fonds');
        expect(deckLabel(edition, 'deed', 'en')).toBe('Title deed');
        expect(elementLabel('card.chance.03', edition, 'nl')).toBe('Roddel 3');
        expect(elementLabel('card_back.chance', edition, 'nl')).toBe(
            'Roddel: achterkant',
        );
        expect(elementLabel('card.chest.03', edition, 'en')).toBe(
            'Community Chest 3',
        );
    });

    it('labels a word for the Controle list', () => {
        const edition = makeEdition();

        expect(elementLabel('words.house', edition, 'nl')).toBe('Woord: huis');
        expect(elementLabel('words.chest', edition, 'en')).toBe(
            'Word: second deck',
        );
    });
});
