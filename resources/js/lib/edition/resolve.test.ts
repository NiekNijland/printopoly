import { describe, expect, it } from 'vitest';
import { standardEdition } from '@/lib/game/standard-edition';
import { setElement, updateElement } from './changes';
import { countCustomized, resolveEdition } from './resolve';
import { makeEdition, photo } from './test-utils';
import type { Edition } from './types';

describe('resolveEdition', () => {
    it('gives the standard data when there are no overrides', () => {
        const resolved = resolveEdition(makeEdition());
        expect(resolved.spaces).toHaveLength(40);
        expect(resolved.spaces[1]?.name).toBe('Molenweg');
        expect(resolved.spaces[1]?.base).toBe(standardEdition.spaces[1]);
        expect(resolved.deeds).toHaveLength(28);
        expect(resolved.decks?.chance).toHaveLength(16);
        expect(resolved.decks?.chest).toHaveLength(16);
        expect(resolved.customizedCount).toBe(0);
        expect(resolved.currency.symbol).toBe('€');
    });

    it('resolves default texts in the language of the edition (B59)', () => {
        const nl = resolveEdition(makeEdition({ language: 'nl' }));
        const en = resolveEdition(makeEdition({ language: 'en' }));
        expect(nl.spaces[1]?.name).toBe('Molenweg');
        expect(en.spaces[1]?.name).toBe('Mill Lane');
        expect(nl.decks?.chance[0]?.text).toBe(
            'Draai om en loop recht naar Start. Je krijgt 200 van de bank.',
        );
        expect(en.decks?.chance[0]?.text).toContain('Turn around');
        expect(en.currency.symbol).toBe('M');
    });

    it('keeps the original effect and text as reference next to an override (B32)', () => {
        const { edition } = updateElement(makeEdition(), 'card.chance.01', {
            text: 'Eigen tekst',
            amount: 25,
        });
        const card = resolveEdition(edition).decks?.chance[0];
        expect(card).toMatchObject({
            id: 'chance.01',
            text: 'Eigen tekst',
            amount: 25,
            customized: true,
        });
        expect(card?.effect).toBe('Ga naar Start en ontvang 200');
        expect(card?.originalText).toContain('Draai om');
    });

    it('applies custom names to spaces and to their deeds', () => {
        const { edition } = setElement(makeEdition(), 'space.01', {
            name: 'Stadspark',
        });
        const resolved = resolveEdition(edition);
        expect(resolved.spaces[1]).toMatchObject({
            name: 'Stadspark',
            customized: true,
        });
        expect(resolved.deeds?.[0]).toMatchObject({
            name: 'Stadspark',
            index: 1,
        });
        expect(resolved.deeds?.[0]?.space.position).toBe(1);
    });

    it('lets a deed override its own name', () => {
        let { edition } = setElement(makeEdition(), 'space.01', {
            name: 'Stadspark',
        });
        edition = setElement(edition, 'deed.01', {
            name: 'Park (akte)',
        }).edition;
        const resolved = resolveEdition(edition);
        expect(resolved.spaces[1]?.name).toBe('Stadspark');
        expect(resolved.deeds?.[0]?.name).toBe('Park (akte)');
    });

    it('never touches fixed values (B29, B58)', () => {
        const base = resolveEdition(makeEdition());
        const { edition } = setElement(makeEdition(), 'space.01', {
            name: 'Stadspark',
            photo: photo(),
        });
        const changed = resolveEdition(edition);
        expect(changed.spaces[1]?.base).toEqual(base.spaces[1]?.base);
    });

    it('leaves parts that are off out, but keeps their overrides (B99)', () => {
        let edition = makeEdition();
        edition = setElement(edition, 'note.500', { photo: photo() }).edition;
        edition = setElement(edition, 'box_lid', { name: 'Deksel' }).edition;
        const off = resolveEdition(edition);
        expect(off.money).toBeNull();
        expect(off.boxLid).toBeNull();
        expect(off.customizedCount).toBe(0);
        expect(Object.keys(edition.elements)).toHaveLength(2);

        const on = resolveEdition({
            ...edition,
            parts: { ...edition.parts, money: true, boxLid: true },
        });
        expect(
            on.money?.notes.find((note) => note.value === 500),
        ).toMatchObject({ customized: true, count: 30 });
        expect(on.boxLid).toMatchObject({ name: 'Deksel', customized: true });
        expect(on.customizedCount).toBe(2);
        expect(countCustomized(edition)).toBe(0);
    });

    it('names pawns per language and exposes free layers', () => {
        const edition = {
            ...makeEdition({
                language: 'en',
                parts: { pawns: true, boxLid: true },
            }),
            elements: {
                box_lid: {
                    layers: [
                        {
                            id: 'a',
                            kind: 'text' as const,
                            text: 'Hi',
                            x: 0,
                            y: 0,
                            w: 10,
                            h: 10,
                        },
                    ],
                },
            },
        };
        const resolved = resolveEdition(edition);
        expect(resolved.pawns?.[0]?.name).toBe('Pawn 1');
        expect(resolved.pawns).toHaveLength(8);
        expect(resolved.boxLid?.layers).toHaveLength(1);
    });

    it('throws for an unknown currency', () => {
        const currency = 'btc' as unknown as Edition['currency'];

        expect(() => resolveEdition({ ...makeEdition(), currency })).toThrow(
            RangeError,
        );
    });
});

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
            bank: { name: 'Bank van de club' },
        });
        const notes = resolved.money?.notes ?? [];
        expect(notes.find((note) => note.value === 100)?.color).toBe('#112233');
        expect(notes.find((note) => note.value === 50)?.color).toBe(
            standardEdition.money.notes.find((note) => note.value === 50)
                ?.color,
        );
        expect(resolved.money?.bankName).toBe('Bank van de club');
        expect(money({ bank: { name: '' } }).money?.bankName).toBeUndefined();
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
            'card.chest.02': { amount: -15 },
        });
        expect(resolved.houseRules?.text).toBe('Geld onder Vrij parkeren');
        expect(resolved.decks?.chest[1]?.amount).toBe(-15);
    });
});

describe('style (B130)', () => {
    it('has no accent and no backdrop by default, and the standard group colours', () => {
        const resolved = resolveEdition(makeEdition());

        expect(resolved.accent).toBeUndefined();
        expect(resolved.groups.find((g) => g.id === 'red')?.color).toBe(
            standardEdition.groups.find((g) => g.id === 'red')?.color,
        );
    });

    it('takes the colour of a group and the accent from their overrides', () => {
        const { edition } = updateElement(makeEdition(), 'group.red', {
            color: '#123456',
            town: 'Zwolle',
        });
        const { edition: withAccent } = updateElement(edition, 'theme_accent', {
            color: '#E6007E',
        });
        const resolved = resolveEdition(withAccent);
        const red = resolved.groups.find((g) => g.id === 'red');

        expect(red?.color).toBe('#123456');
        expect(red?.town).toBe('Zwolle');
        expect(resolved.accent).toBe('#E6007E');
    });

    it('resolves a pattern on a card back', () => {
        const { edition } = updateElement(makeEdition(), 'card_back.chest', {
            pattern: 'rings',
        });
        const resolved = resolveEdition(edition);

        expect(resolved.cardBacks?.chest.pattern).toBe('rings');
        expect(resolved.cardBacks?.chance.pattern).toBeUndefined();
    });
});
