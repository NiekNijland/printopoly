import { describe, expect, it } from 'vitest';
import { standardEdition } from '@/lib/render/standard-edition';
import { makeEdition } from '../../testing/edition-test-utils';
import { updateElement } from './edition-changes';
import { resolveEdition } from './edition-resolve';
import {
    resolvedDeeds,
    resolvedGroups,
    resolvedNotes,
    resolvedPawns,
    resolvedSpaces,
} from './edition-resolve-board';
import type { Edition } from './edition-types';
import { resolveWords } from './edition-words';

describe('towns of the colour groups', () => {
    it('has no town by default, in both languages', () => {
        for (const language of ['nl', 'en'] as const) {
            const resolved = resolveEdition(makeEdition({ language }));

            expect(resolved.groups).toHaveLength(8);
            expect(resolved.groups.every((g) => g.town === undefined)).toBe(
                true,
            );
            expect(resolved.spaces.every((s) => s.town === undefined)).toBe(
                true,
            );
            expect(resolved.deeds?.every((d) => d.town === undefined)).toBe(
                true,
            );
        }
    });

    it('gives the town to every street and deed of the group, and to nothing else', () => {
        const { edition } = updateElement(makeEdition(), 'group.brown', {
            town: '  Zwolle ',
        });
        const resolved = resolveEdition(edition);
        const brown = resolved.spaces.filter(
            (space) =>
                space.base.type === 'street' && space.base.group === 'brown',
        );

        expect(brown).toHaveLength(2);
        expect(brown.every((space) => space.town === 'Zwolle')).toBe(true);
        expect(
            resolved.spaces.filter((space) => space.town !== undefined),
        ).toHaveLength(2);
        expect(
            resolved.deeds?.filter((deed) => deed.town === 'Zwolle'),
        ).toHaveLength(2);
        expect(resolved.groups[0]).toMatchObject({
            id: 'brown',
            town: 'Zwolle',
            customized: true,
        });
        expect(resolved.customizedCount).toBe(1);
    });

    it('treats an empty town as none', () => {
        const { edition } = updateElement(makeEdition(), 'group.red', {
            town: '   ',
        });

        expect(
            resolveEdition(edition).spaces.every((s) => s.town === undefined),
        ).toBe(true);
    });
});

describe('money, pawns and house rules', () => {
    const money = (elements: Edition['elements']) =>
        resolveEdition({
            ...makeEdition(),
            parts: {
                ...makeEdition().parts,
                money: true,
                pawns: true,
                houseRules: true,
            },
            elements,
        });

    it('uses the colour of a note and one bank name for all notes (B85)', () => {
        const resolved = money({
            'note.100': { color: '#112233' },
            'words.bank': { name: 'Bank van de club' },
        });
        const notes = resolved.money?.notes ?? [];
        expect(notes.find((note) => note.value === 100)?.color).toBe('#112233');
        expect(notes.find((note) => note.value === 50)?.color).toBe(
            standardEdition.money.notes.find((note) => note.value === 50)
                ?.color,
        );
        expect(resolved.money?.bankName).toBe('Bank van de club');
        expect(
            money({ 'words.bank': { name: '' } }).money?.bankName,
        ).toBeUndefined();
    });

    it('leaves out pawns that were taken out, and keeps their numbers', () => {
        const resolved = money({
            'pawn.02': { hidden: true },
            'pawn.05': { name: 'Hoed' },
        });
        expect(resolved.pawns?.map((pawn) => pawn.index)).toEqual([
            1, 3, 4, 5, 6, 7, 8,
        ]);
        expect(resolved.pawns?.find((pawn) => pawn.index === 5)?.name).toBe(
            'Hoed',
        );
    });

    it('resolves the house rules text and the card amount', () => {
        const resolved = money({
            house_rules: { text: 'Geld onder Vrij parkeren' },
            'card.chest.02': { amount: 220, purpose: '  je verjaardag ' },
        });
        expect(resolved.houseRules?.text).toBe('Geld onder Vrij parkeren');
        expect(resolved.decks?.chest[1]).toMatchObject({
            amount: 220,
            standardAmount: 200,
            lineAmount: 220,
            purpose: 'je verjaardag',
        });
    });

    it('prefills every card amount with the standard amount (B132)', () => {
        const resolved = resolveEdition(makeEdition({ language: 'en' }));
        // "Pay a 15 fine" and "Collect 100": the amount line carries the money, the story does not repeat it.
        expect(resolved.decks?.chance[11]).toMatchObject({
            amount: -15,
            lineAmount: -15,
            text: 'Caught speeding. That means a fine.',
        });
        expect(resolved.decks?.chest[6]).toMatchObject({
            amount: 100,
            lineAmount: 100,
        });
        // A text that holds {amount} itself gets no line under it.
        expect(resolved.decks?.chance[13]).toMatchObject({
            amount: -50,
            lineAmount: undefined,
            text: 'Your treat: pay each player £50.',
        });
        // A card without money has no amount.
        expect(resolved.decks?.chance[0]?.amount).toBeUndefined();
    });

    it('pulls an amount from before B132 into the range, and switches the line off with 0', () => {
        const resolved = money({
            'card.chest.03': { amount: -500 },
            'card.chest.04': { amount: 0 },
        });
        expect(resolved.decks?.chest[2]?.amount).toBe(-60);
        expect(resolved.decks?.chest[3]?.lineAmount).toBe(0);
    });
});

const withOverride = (
    edition: Edition,
    key: string,
    patch: Parameters<typeof updateElement>[2],
): Edition => updateElement(edition, key, patch).edition;

describe('the board parts of a resolved edition', () => {
    it('resolves every group, space, deed and note of the standard game', () => {
        const edition = makeEdition();

        expect(resolvedGroups(edition, standardEdition)).toHaveLength(
            standardEdition.groups.length,
        );
        expect(
            resolvedSpaces(
                edition,
                standardEdition,
                resolveWords(edition, standardEdition),
            ).map((space) => space.position),
        ).toEqual(standardEdition.spaces.map((space) => space.position));
        expect(resolvedDeeds(edition, standardEdition)).toHaveLength(28);
        expect(
            resolvedNotes(edition, standardEdition).map((note) => note.value),
        ).toEqual(standardEdition.money.notes.map((note) => note.value));
    });

    it('names a Chance space after the deck word and a street after the edition', () => {
        const edition = withOverride(makeEdition(), 'space.01', {
            name: 'Dorpsplein',
        });
        const words = resolveWords(edition, standardEdition);
        const spaces = resolvedSpaces(edition, standardEdition, words);
        const chance = spaces.find((space) => space.base.type === 'chance');

        expect(spaces[1]?.name).toBe('Dorpsplein');
        expect(spaces[1]?.customized).toBe(true);
        expect(chance?.name).toBe(words.decks.chance);
    });

    it('gives a deed the name of its space and its own index', () => {
        const edition = withOverride(makeEdition(), 'space.01', {
            name: 'Dorpsplein',
        });
        const [first] = resolvedDeeds(edition, standardEdition);

        expect(first?.index).toBe(1);
        expect(first?.key).toBe('deed.01');
        expect(first?.name).toBe('Dorpsplein');
    });

    it('numbers the pawns and leaves out a hidden one', () => {
        const edition = withOverride(makeEdition(), 'pawn.02', {
            hidden: true,
        });
        const pawns = resolvedPawns(edition);

        expect(pawns.map((pawn) => pawn.index)).not.toContain(2);
        expect(pawns[0]?.key).toBe('pawn.01');
    });
});
