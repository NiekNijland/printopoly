import { describe, expect, it } from 'vitest';

import { readStoredEdition } from './repair';
import { parseEdition } from './schema';
import { makeEdition } from './test-utils';

describe('readStoredEdition', () => {
    it('reads a valid edition unchanged, with nothing repaired', () => {
        const edition = {
            ...makeEdition(),
            elements: { 'space.01': { name: 'A', amounts: { price: 70 } } },
        };

        expect(readStoredEdition(edition)).toEqual({
            edition,
            repaired: [],
        });
    });

    it('repairs the shape the old swap left behind: amounts of another colour group (round 4, bug 1)', () => {
        const broken = {
            ...makeEdition(),
            elements: {
                'space.01': {
                    name: 'Kaperspad',
                    amounts: { price: 120, houseCost: 55 },
                },
                'space.06': { name: 'Ankerbaai', amounts: { price: 70 } },
            },
        };
        expect(parseEdition(broken).ok).toBe(false);

        const read = readStoredEdition(broken);

        expect(read?.edition.elements).toEqual({
            'space.01': {
                name: 'Kaperspad',
                amounts: { price: 72, houseCost: 55 },
            },
            'space.06': { name: 'Ankerbaai', amounts: { price: 80 } },
        });
        expect(read?.repaired).toEqual([
            'space.01.amounts: pulled into range',
            'space.06.amounts: pulled into range',
        ]);
        expect(parseEdition(read?.edition).ok).toBe(true);
    });

    it('drops unknown amounts, broken fields and unknown elements, and keeps the rest', () => {
        const read = readStoredEdition({
            ...makeEdition(),
            elements: {
                'space.01': {
                    name: 'Ankerbaai',
                    amounts: { price: 66, bogus: 3, 'rent.0': 'x' },
                    photoStyle: 'sideways',
                },
                'space.02': { text: 'not a corner' },
                'nothing.here': { name: 'x' },
                'card.chance.17': { text: 'no added flag' },
                'card.chance.18': { added: true, text: 'Storm', amount: 9999 },
            },
        });

        expect(read?.edition.elements).toEqual({
            'space.01': { name: 'Ankerbaai', amounts: { price: 66 } },
            'card.chance.18': { added: true, text: 'Storm' },
        });
        expect(read?.repaired).toContain('nothing.here: dropped');
        expect(read?.repaired).toContain('space.01.photoStyle: dropped');
    });

    it('resets settings that break a rule', () => {
        const read = readStoredEdition({
            ...makeEdition(),
            theme: 'neon',
            currency: 'doubloon',
            parts: { board: false, deeds: 'yes' },
            boardProfile: { id: 'x' },
        });

        expect(read?.edition.theme).toBe('classic');
        expect(read?.edition.currency).toBe('eur');
        expect(read?.edition.parts.board).toBe(true);
        expect(read?.edition.parts.deeds).toBe(true);
        expect(parseEdition(read?.edition).ok).toBe(true);
    });

    it('gives up on what cannot be guessed: no id or another schema version', () => {
        expect(readStoredEdition({ id: 'e1' })).toBeUndefined();
        expect(
            readStoredEdition({ ...makeEdition(), schemaVersion: 99 }),
        ).toBeUndefined();
        expect(readStoredEdition({ ...makeEdition(), id: '' })).toBeUndefined();
        expect(readStoredEdition('nope')).toBeUndefined();
    });
});
