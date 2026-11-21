import { describe, expect, it } from 'vitest';

import { sampleEdition } from '@/data/sample-edition';
import { DEFAULT_PARTS } from '@/lib/edition/types';

import { cardCountOf, enabledPrintParts } from './print-edition';

describe('print parts of an edition', () => {
    const base = {
        ...sampleEdition('nl'),
        parts: { ...DEFAULT_PARTS },
    };

    it('counts the deeds and both decks, and the house rules card when it is on', () => {
        expect(cardCountOf(base)).toBe(60);
        expect(
            cardCountOf({
                ...base,
                parts: { ...base.parts, houseRules: true },
            }),
        ).toBe(61);
        expect(
            cardCountOf({ ...base, parts: { ...base.parts, deeds: false } }),
        ).toBe(32);
    });

    it('counts the extra cards of both decks (B135)', () => {
        expect(
            cardCountOf({
                ...base,
                elements: {
                    'card.chance.17': { added: true },
                    'card.chest.17': { added: true },
                    'card.chest.18': { added: true },
                },
            }),
        ).toBe(63);
    });

    it('lists the production parts the way the server does', () => {
        expect(enabledPrintParts(base)).toEqual(['board', 'cards']);
        expect(
            enabledPrintParts({
                ...base,
                parts: {
                    ...base.parts,
                    deeds: false,
                    cards: false,
                    houseRules: true,
                    money: true,
                    pawns: true,
                    boxLid: true,
                },
            }),
        ).toEqual(['board', 'cards', 'money', 'tokens', 'box_lid']);
    });
});
