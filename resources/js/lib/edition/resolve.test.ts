import { describe, expect, it } from 'vitest';
import { standardEdition } from '@/lib/game/standard-edition';
import { setElement, updateElement } from './changes';
import { countCustomized, resolveEdition } from './resolve';
import { makeEdition, photo } from './test-utils';
import type { Edition } from './types';

describe('resolveEdition', () => {
    it('names the salary of the edition in the standard cards about Start, not in cards with their own amount (round 4, bug 3)', () => {
        const edition: Edition = {
            ...makeEdition({ language: 'nl' }),
            elements: { 'space.00': { amounts: { salary: 240 } } },
        };

        const decks = resolveEdition(edition).decks;

        expect(decks?.chance[0]?.text).toBe(
            'Draai om en loop recht naar Start. Je krijgt € 240 van de bank.',
        );
        expect(decks?.chest[5]?.text).toContain('geen € 240');
        // "De bank heeft zich vergist": an amount card of 200, not the salary.
        expect(decks?.chest[1]?.amount).toBe(200);
        expect(decks?.chest[1]?.effect).toContain('200');
    });

    it('prints the amount of an extra card with the own currency sign (round 4, bug 4)', () => {
        const edition: Edition = {
            ...makeEdition({ language: 'nl' }),
            elements: {
                'words.currency': { name: 'Dukaat', text: 'dk' },
                'card.chance.17': {
                    added: true,
                    text: 'Een storm! Betaal {amount} voor de reparatie.',
                    amount: -50,
                },
            },
        };

        const card = resolveEdition(edition).decks?.chance[16];

        expect(card?.text).toBe('Een storm! Betaal dk 50 voor de reparatie.');
        expect(card?.amount).toBe(-50);
    });

    it('puts the currency of the edition before every amount in the standard card texts', () => {
        const en = resolveEdition(
            makeEdition({ language: 'en', currency: 'play' }),
        );
        const texts = en.decks?.chance.map((card) => card.text) ?? [];

        expect(texts).toContain('Caught speeding. That means a fine.');
        expect(texts).toContain('Your treat: pay each player M50.');
        // The dice multiplier is not an amount.
        expect(texts).toContain(
            'Go to the nearest utility. If a player owns it, roll and pay 10 times the dice.',
        );
    });

    it('names a renamed space in the standard card of the editor too', () => {
        const { edition } = setElement(
            makeEdition({ language: 'en' }),
            'space.11',
            { name: 'Zandbelt' },
        );
        const card = resolveEdition(edition).decks?.chance[2];

        expect(card?.originalText).toContain('Zandbelt');
        expect(card?.effect).toContain('Zandbelt');
    });

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
            'Draai om en loop recht naar Start. Je krijgt €\u00A0200 van de bank.',
        );
        expect(en.decks?.chance[0]?.text).toContain('Turn around');
        expect(en.currency.symbol).toBe('£');
    });

    it('keeps the original effect and text as reference next to an override (B32)', () => {
        const { edition } = updateElement(makeEdition(), 'card.chance.01', {
            text: 'Eigen tekst',
        });
        const card = resolveEdition(edition).decks?.chance[0];
        expect(card).toMatchObject({
            id: 'chance.01',
            text: 'Eigen tekst',
            amount: undefined,
            customized: true,
        });
        expect(card?.effect).toBe('Ga naar Start en ontvang €\u00A0200');
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

    it('marks a lid that shows the logo of the board centre, so it goes where the board picture goes (B241, B256)', () => {
        const base: Edition = {
            ...makeEdition({ language: 'nl' }),
            parts: { ...makeEdition().parts, boxLid: true },
            elements: {
                board_center: { centerMode: 'logo', photo: photo('logo') },
                box_lid: { photo: { ...photo('logo'), fit: true } },
            },
        };

        expect(resolveEdition(base).boxLid?.logo).toBe(true);
        // Another photo on the lid, or the centre back on its name: an ordinary photo above the name.
        expect(
            resolveEdition({
                ...base,
                elements: { ...base.elements, box_lid: { photo: photo('p2') } },
            }).boxLid?.logo,
        ).toBe(false);
        expect(
            resolveEdition({
                ...base,
                elements: {
                    ...base.elements,
                    board_center: { centerMode: 'name', photo: photo('logo') },
                },
            }).boxLid?.logo,
        ).toBe(false);
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

describe('style (B130)', () => {
    it('has no accent and no backdrop by default, and the standard group colours', () => {
        const resolved = resolveEdition(makeEdition());

        expect(resolved.groups.find((g) => g.id === 'red')?.color).toBe(
            standardEdition.groups.find((g) => g.id === 'red')?.color,
        );
    });

    it('takes the colour of a group from its override and ignores a stored accent (B203)', () => {
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
        expect('accent' in resolved).toBe(false);
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
