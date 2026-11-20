import { describe, expect, it } from 'vitest';
import {
    ALLOWED_FIELDS,
    THEME_LAYOUTS,
    cardKey,
    deedKey,
    noteKey,
    parseKey,
    partOfKey,
    spaceKey,
} from './keys';

describe('parseKey', () => {
    it.each([
        ['space.00', 'space', 'board'],
        ['space.39', 'space', 'board'],
        ['deed.01', 'deed', 'deeds'],
        ['deed.28', 'deed', 'deeds'],
        ['card.chance.03', 'card', 'cards'],
        ['card.chest.16', 'card', 'cards'],
        ['note.500', 'note', 'money'],
        ['note.1', 'note', 'money'],
        ['pawn.08', 'pawn', 'pawns'],
        ['card_back.chance', 'cardBack', 'cards'],
        ['card_back.deed', 'cardBack', 'deeds'],
        ['box_lid', 'boxLid', 'boxLid'],
        ['board_center', 'boardCenter', 'board'],
        ['house_rules', 'houseRules', 'houseRules'],
    ])('accepts %s', (key, kind, part) => {
        expect(parseKey(key)).toEqual({ kind, part });
    });

    it.each([
        'space.40',
        'space.5',
        'space',
        'deed.00',
        'deed.29',
        'card.chance.17',
        'card.luck.01',
        'note.2',
        'note.0500',
        'pawn.09',
        'box_lid.1',
        'x.01',
        '',
    ])('rejects %s', (key) => {
        expect(parseKey(key)).toBeNull();
    });

    it('builds keys that parse', () => {
        expect(parseKey(spaceKey(7))?.kind).toBe('space');
        expect(parseKey(deedKey(3))?.kind).toBe('deed');
        expect(parseKey(cardKey('chest', 9))?.kind).toBe('card');
        expect(parseKey(noteKey(100))?.kind).toBe('note');
        expect(partOfKey('nope')).toBeNull();
    });
});

describe('field rules', () => {
    it('lets only cards carry an amount (B29, B32, B58)', () => {
        const withAmount = Object.entries(ALLOWED_FIELDS).filter(([, fields]) =>
            fields.includes('amount'),
        );
        expect(withAmount.map(([kind]) => kind)).toEqual(['card']);
    });

    it('has the frame and text layouts in every theme', () => {
        for (const layouts of Object.values(THEME_LAYOUTS)) {
            expect(layouts).toContain('frame');
            expect(layouts).toContain('text');
        }
    });
});
