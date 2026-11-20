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

    it('defaults the layout to text without a photo and frame with one', () => {
        let edition = setElement(makeEdition(), 'space.01', {
            photo: photo(),
        }).edition;
        edition = setElement(edition, 'space.03', { name: 'x' }).edition;
        const resolved = resolveEdition(edition);
        expect(resolved.spaces[1]?.layout).toBe('frame');
        expect(resolved.spaces[3]?.layout).toBe('text');
        expect(resolved.spaces[4]?.layout).toBe('text');
    });

    it('falls back to the frame when a layout does not exist in the theme', () => {
        const edition = setElement(makeEdition({ theme: 'riso' }), 'space.01', {
            layout: 'full',
        }).edition;
        expect(resolveEdition(edition).spaces[1]?.layout).toBe('frame');
        expect(
            resolveEdition({ ...edition, theme: 'classic' }).spaces[1]?.layout,
        ).toBe('full');
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
