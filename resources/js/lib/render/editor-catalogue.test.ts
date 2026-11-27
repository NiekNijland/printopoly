import { describe, expect, it } from 'vitest';

import { makeEdition } from '@/testing/edition-test-utils';

import type { ElementOverride } from './edition-types';
import {
    BOARD_ORDER,
    EDITOR_TABS,
    boardGroups,
    deckLabel,
    deedKeyForSpace,
    elementLabel,
    firstKey,
    holdsPhoto,
    isCustomized,
    spacePosition,
    stepKey,
    tabKeys,
    tabOfKey,
} from './editor-catalogue';

const editionWith = (elements: Record<string, ElementOverride> = {}) => ({
    ...makeEdition(),
    elements,
});

describe('tabOfKey', () => {
    it('puts each kind of element on its tab', () => {
        expect(tabOfKey('card.chance.01')).toBe('cards');
        expect(tabOfKey('card_back.deed')).toBe('cards');
        expect(tabOfKey('note.20')).toBe('money');
        expect(tabOfKey('pawn.01')).toBe('box');
        expect(tabOfKey('box_lid')).toBe('box');
        expect(tabOfKey('house_rules')).toBe('box');
        expect(tabOfKey('invitation')).toBe('box');
        expect(tabOfKey('space.05')).toBe('board');
        expect(tabOfKey('nonsense')).toBe('board');
    });
});

describe('tabKeys', () => {
    it('lists the 40 spaces and then the centre on the board tab', () => {
        expect(EDITOR_TABS).toEqual(['board', 'cards', 'money', 'box']);
        expect(tabKeys('board')).toEqual([...BOARD_ORDER]);
        expect(BOARD_ORDER).toHaveLength(41);
        expect(BOARD_ORDER.at(-1)).toBe('board_center');
    });

    it('lists each deck with its back, then the deed back', () => {
        const keys = tabKeys('cards');

        expect(keys[0]).toBe('card.chance.01');
        expect(keys).toContain('card_back.chance');
        expect(keys.indexOf('card_back.chance')).toBeLessThan(
            keys.indexOf('card.chest.01'),
        );
        expect(keys.at(-2)).toBe('card_back.chest');
        expect(keys.at(-1)).toBe('card_back.deed');
    });

    it('lists the notes by value', () => {
        expect(tabKeys('money')).toEqual([
            'note.1',
            'note.5',
            'note.10',
            'note.20',
            'note.50',
            'note.100',
            'note.500',
        ]);
    });

    it('lists the box parts and leaves out hidden pawns', () => {
        expect(tabKeys('box', { 'pawn.02': { hidden: true } })).toEqual([
            'box_lid',
            'pawn.01',
            'pawn.03',
            'pawn.04',
            'pawn.05',
            'pawn.06',
            'pawn.07',
            'pawn.08',
            'house_rules',
            'invitation',
        ]);
    });

    it('gives the first key of a tab', () => {
        expect(firstKey('board')).toBe('space.00');
        expect(firstKey('box')).toBe('box_lid');
    });
});

describe('isCustomized', () => {
    it('is false for an element as the standard game has it', () => {
        expect(isCustomized(editionWith(), 'space.01')).toBe(false);
    });

    it('is true for a changed element', () => {
        expect(
            isCustomized(
                editionWith({ 'space.01': { name: 'Thuis' } }),
                'space.01',
            ),
        ).toBe(true);
    });

    it('counts a space as changed when its title deed is', () => {
        const edition = editionWith({ 'deed.01': { text: 'Ons eerste huis' } });

        expect(isCustomized(edition, 'space.01')).toBe(true);
        expect(isCustomized(edition, 'space.03')).toBe(false);
        expect(isCustomized(edition, 'space.02')).toBe(false);
    });
});

describe('deedKeyForSpace and spacePosition', () => {
    it('finds the deed of an ownable space only', () => {
        expect(deedKeyForSpace(1)).toBe('deed.01');
        expect(deedKeyForSpace(39)).toMatch(/^deed\.\d{2}$/);
        expect(deedKeyForSpace(2)).toBeUndefined();
        expect(deedKeyForSpace(0)).toBeUndefined();
    });

    it('reads the position of a space key', () => {
        expect(spacePosition('space.07')).toBe(7);
        expect(spacePosition('space.7')).toBeUndefined();
        expect(spacePosition('deed.07')).toBeUndefined();
    });
});

describe('stepKey', () => {
    const keys = ['a', 'b', 'c'];

    it('steps forward and back, wrapping around', () => {
        expect(stepKey(keys, 'b', 1)).toBe('c');
        expect(stepKey(keys, 'c', 1)).toBe('a');
        expect(stepKey(keys, 'a', -1)).toBe('c');
    });

    it('is undefined for an empty list', () => {
        expect(stepKey([], 'a', 1)).toBeUndefined();
    });
});

describe('deckLabel', () => {
    it('names the deck by the standard name in the interface language', () => {
        expect(deckLabel(editionWith(), 'chance', 'en')).toBe('Chance');
        expect(deckLabel(editionWith(), 'deed', 'nl')).toBe('Eigendomsbewijs');
    });

    it('uses the own word of the edition', () => {
        expect(
            deckLabel(
                editionWith({ 'words.chance': { name: 'Gok' } }),
                'chance',
                'en',
            ),
        ).toBe('Gok');
    });
});

describe('elementLabel', () => {
    const label = (
        key: string,
        elements: Record<string, ElementOverride> = {},
    ) => elementLabel(key, editionWith(elements), 'nl');

    it('names a space by its own or standard name, and a deck space by its deck', () => {
        expect(label('space.01')).toBe('Molenweg');
        expect(label('space.01', { 'space.01': { name: 'Thuis' } })).toBe(
            'Thuis',
        );
        expect(label('space.01', { 'space.01': { name: ' ' } })).toBe(
            'Vak 1, nog zonder naam',
        );
        expect(label('space.07')).toBe('Kans');
        expect(label('space.02', { 'words.chest': { name: 'Pot' } })).toBe(
            'Pot',
        );
    });

    it('names a deed after its space', () => {
        expect(label('deed.01')).toBe('Eigendomsbewijs: Molenweg');
        expect(label('deed.01', { 'space.01': { name: 'Thuis' } })).toBe(
            'Eigendomsbewijs: Thuis',
        );
        expect(label('deed.01', { 'deed.01': { name: 'Ons huis' } })).toBe(
            'Eigendomsbewijs: Ons huis',
        );
    });

    it('names cards, backs, notes and pawns', () => {
        expect(label('card.chest.02')).toBe('Algemeen Fonds 2');
        expect(label('card.chance.12')).toBe('Kans 12');
        expect(label('card_back.chance')).toBe('Kans: achterkant');
        expect(label('card_back.deed')).toBe('Eigendomsbewijs: achterkant');
        expect(label('note.500')).toBe('Biljet van 500');
        expect(label('pawn.03')).toBe('Pion 3');
        expect(label('pawn.03', { 'pawn.03': { name: 'Opa' } })).toBe('Opa');
    });

    it('names the single parts, words, colours and styles', () => {
        expect(label('box_lid')).toBe('Doosdeksel');
        expect(label('board_center')).toBe('Midden van het bord');
        expect(label('house_rules')).toBe('Huisregels');
        expect(label('rules_booklet')).toBe('Spelregelboekje');
        expect(label('invitation')).toBe('Uitnodiging');
        expect(label('words.bank')).toBe('Woord: naam van de bank');
        expect(label('theme_accent')).toBe('Kleuren');
        expect(label('style.board')).toBe('Stijl');
        expect(label('group.red')).toBe('Groep rood');
    });

    it('speaks English when the interface does', () => {
        const edition = editionWith();

        expect(elementLabel('group.darkblue', edition, 'en')).toBe(
            'Dark blue group',
        );
        expect(elementLabel('note.1', edition, 'en')).toBe('Note of 1');
        expect(elementLabel('words.chance', edition, 'en')).toBe(
            'Word: first deck',
        );
        expect(
            elementLabel(
                'space.04',
                { ...edition, elements: { 'space.04': { name: '' } } },
                'en',
            ),
        ).toBe('Space 4, no name yet');
    });

    it('gives back a key it does not know', () => {
        expect(label('nonsense')).toBe('nonsense');
    });
});

describe('boardGroups', () => {
    it('splits the board in four stretches between the corners', () => {
        const groups = boardGroups();

        expect(groups.map((group) => [group.from, group.to])).toEqual([
            [0, 10],
            [10, 20],
            [20, 30],
            [30, 0],
        ]);
        expect(groups[3]?.keys).toEqual([
            'space.30',
            'space.31',
            'space.32',
            'space.33',
            'space.34',
            'space.35',
            'space.36',
            'space.37',
            'space.38',
            'space.39',
        ]);
    });
});

describe('holdsPhoto', () => {
    it('gives a photo frame to streets, stations, utilities and corners', () => {
        expect(holdsPhoto('space.01')).toBe(true);
        expect(holdsPhoto('space.05')).toBe(true);
        expect(holdsPhoto('space.28')).toBe(true);
        expect(holdsPhoto('space.20')).toBe(true);
    });

    it('draws text only on deck and tax spaces', () => {
        expect(holdsPhoto('space.07')).toBe(false);
        expect(holdsPhoto('space.38')).toBe(false);
    });

    it('fills every element off the board, but not the centre or an unknown key', () => {
        expect(holdsPhoto('pawn.01')).toBe(true);
        expect(holdsPhoto('card.chance.01')).toBe(true);
        expect(holdsPhoto('board_center')).toBe(false);
        expect(holdsPhoto('nonsense')).toBe(false);
    });
});
