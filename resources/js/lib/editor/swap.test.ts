import { describe, expect, it } from 'vitest';

import { applyChanges } from '@/lib/edition/changes';
import { parseEdition } from '@/lib/edition/schema';
import { makeEdition, photo } from '@/lib/edition/test-utils';

import { canSwap, swapChanges, swapTargets } from './swap';

describe('canSwap', () => {
    it('allows streets with streets, stations with stations and utilities with utilities', () => {
        expect(canSwap(1, 3)).toBe(true);
        expect(canSwap(5, 15)).toBe(true);
        expect(canSwap(12, 28)).toBe(true);
    });

    it('refuses other kinds, corners, tax, chance and a space with itself', () => {
        expect(canSwap(1, 5)).toBe(false);
        expect(canSwap(5, 12)).toBe(false);
        expect(canSwap(0, 10)).toBe(false);
        expect(canSwap(2, 17)).toBe(false);
        expect(canSwap(4, 38)).toBe(false);
        expect(canSwap(1, 1)).toBe(false);
    });

    it('lists the targets of a street without itself', () => {
        const targets = swapTargets(1);

        expect(targets).toHaveLength(21);
        expect(targets).not.toContain(1);
        expect(targets).not.toContain(5);
    });
});

describe('swapChanges', () => {
    it('moves name, photo and deed content, in one batch of changes', () => {
        const base = makeEdition();
        const edition = {
            ...base,
            elements: {
                'space.01': { name: 'Jans Bierkelder', photo: photo('p1') },
                'deed.01': { name: 'Jans Bierkelder', photo: photo('p1') },
                'space.03': { name: 'Het Clubhuis' },
            },
        };

        const changes = swapChanges(edition, 1, 3);
        const next = applyChanges(edition, changes);

        expect(next.elements['space.03']).toEqual(edition.elements['space.01']);
        expect(next.elements['deed.02']).toEqual(edition.elements['deed.01']);
        expect(next.elements['space.01']).toEqual({ name: 'Het Clubhuis' });
        expect(next.elements['deed.01']).toBeUndefined();
    });

    it('keeps the amounts at the position, so a swap across colour groups stays valid', () => {
        // Bug report round 4 (Lars): a brown street with price 70 swapped with a light blue one with price 120.
        const edition = {
            ...makeEdition(),
            elements: {
                'space.01': {
                    name: 'Ankerbaai',
                    amounts: { price: 70, 'rent.0': 2 },
                },
                'space.06': {
                    name: 'Kaperspad',
                    amounts: { price: 120, houseCost: 55 },
                },
            },
        };

        const next = applyChanges(edition, swapChanges(edition, 1, 6));

        expect(next.elements['space.01']).toEqual({
            name: 'Kaperspad',
            amounts: { price: 70, 'rent.0': 2 },
        });
        expect(next.elements['space.06']).toEqual({
            name: 'Ankerbaai',
            amounts: { price: 120, houseCost: 55 },
        });
        expect(parseEdition(next).ok).toBe(true);
    });

    it('moves a name to a space without own amounts and leaves the amounts behind', () => {
        const edition = {
            ...makeEdition(),
            elements: {
                'space.01': { amounts: { price: 70 } },
                'space.06': { name: 'Kaperspad' },
            },
        };

        const next = applyChanges(edition, swapChanges(edition, 1, 6));

        expect(next.elements['space.01']).toEqual({
            name: 'Kaperspad',
            amounts: { price: 70 },
        });
        expect(next.elements['space.06']).toBeUndefined();
        expect(parseEdition(next).ok).toBe(true);
    });

    it('swaps nothing for spaces of different kinds', () => {
        expect(swapChanges(makeEdition(), 1, 5)).toEqual([]);
    });

    it('can be undone by applying the changes backwards', () => {
        const edition = {
            ...makeEdition(),
            elements: { 'space.01': { name: 'A' }, 'space.03': { name: 'B' } },
        };
        const changes = swapChanges(edition, 1, 3);
        const swapped = applyChanges(edition, changes);
        const back = applyChanges(swapped, swapChanges(swapped, 1, 3));

        expect(back.elements).toEqual(edition.elements);
    });
});
