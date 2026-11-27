import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { makeEdition, photo } from '../../testing/edition-test-utils';
import { migrateElements, parseEdition, parseOverride } from './edition-schema';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const roundTrip = (value: object): Record<string, unknown> => {
    const copy: unknown = JSON.parse(JSON.stringify(value));
    if (!isRecord(copy)) {
        throw new TypeError('not an object');
    }

    return copy;
};

const valid = () =>
    roundTrip({
        ...makeEdition(),
        elements: {
            'space.01': {
                name: 'Stadspark',
                photo: photo(),
            },
            'card.chance.03': { text: 'Neem een taartje.' },
            'card.chest.03': { amount: -55, purpose: 'je tandarts' },
            box_lid: {
                layers: [
                    {
                        id: 'l1',
                        kind: 'text',
                        text: 'Hoi',
                        x: 1,
                        y: 2,
                        w: 3,
                        h: 4,
                    },
                ],
            },
        },
    });

describe('parseEdition', () => {
    it('accepts a valid edition and returns it unchanged', () => {
        const input = valid();
        const result = parseEdition(input);
        expect(result.ok).toBe(true);
        expect(
            result.ok ? result.value.elements['space.01']?.name : undefined,
        ).toBe('Stadspark');
        expect(
            result.ok ? JSON.parse(JSON.stringify(result.value)) : undefined,
        ).toEqual(input);
    });

    it('rejects non-objects', () => {
        expect(parseEdition(null).ok).toBe(false);
        expect(parseEdition([]).ok).toBe(false);
    });

    it.each([
        ['wrong schema version', { schemaVersion: 2 }, 'schemaVersion'],
        ['empty id', { id: '' }, 'id'],
        ['bad language', { language: 'fr' }, 'language'],
        ['bad currency', { currency: 'btc' }, 'currency'],
        ['bad theme', { theme: 'neon' }, 'theme'],
        ['fractional revision', { revision: 1.5 }, 'revision'],
        [
            'board switched off',
            {
                parts: {
                    board: false,
                    deeds: true,
                    cards: true,
                    money: false,
                    pawns: false,
                    boxLid: false,
                    houseRules: false,
                },
            },
            'parts.board',
        ],
        ['missing part flag', { parts: { board: true } }, 'parts.deeds'],
        [
            'profile that does not fit',
            { boardProfile: { ...DEFAULT_BOARD_PROFILE, corner: 200 } },
            'boardProfile',
        ],
        [
            'panels of 3',
            { boardProfile: { ...DEFAULT_BOARD_PROFILE, panels: 3 } },
            'boardProfile',
        ],
    ])('rejects %s', (_label, patch, fragment) => {
        const result = parseEdition({ ...valid(), ...patch });
        expect(result.ok).toBe(false);
        expect(result.ok ? '' : result.errors.join('\n')).toContain(fragment);
    });

    it('reports every element problem', () => {
        const result = parseEdition({
            ...valid(),
            elements: {
                'space.99': { name: 'x' },
                'space.02': { amount: 5 },
                'space.03': { amount: 'many' },
                'card.chest.01': {
                    photo: {
                        photoId: '',
                        cx: 2,
                        cy: 0,
                        scale: 0,
                        rotation: 0,
                        grayscale: 'no',
                    },
                },
            },
        });
        expect(result.ok).toBe(false);
        const text = result.ok ? '' : result.errors.join('\n');
        expect(text).toContain('space.99: unknown element key');
        expect(text).toContain('space.02: field "amount" is not allowed here');
        expect(text).toContain('space.03: field "amount" is not allowed here');
        expect(text).toContain('card.chest.01.photo');
    });
});

describe('the bank name as a word (B148)', () => {
    it('moves the bank name of an older edition to words.bank', () => {
        const result = parseEdition({
            ...makeEdition(),
            elements: { bank: { name: 'Bank van de club' } },
        });

        expect(result.ok && result.value.elements).toEqual({
            'words.bank': { name: 'Bank van de club' },
        });
    });

    it('keeps words.bank when an edition has both, and leaves other values alone', () => {
        expect(
            migrateElements({
                bank: { name: 'Oud' },
                'words.bank': { name: 'Nieuw' },
            }),
        ).toEqual({ 'words.bank': { name: 'Nieuw' } });
        const plain = { 'space.01': { name: 'X' } };
        expect(migrateElements(plain)).toBe(plain);
        expect(migrateElements(null)).toBeNull();
    });

    it('gives the bank the room of a name, more than other words', () => {
        const errors: string[] = [];
        const long = 'B'.repeat(100);

        expect(parseOverride('words.bank', { name: long }, errors)).toEqual({
            name: long,
        });
        expect(errors).toEqual([]);
    });
});

describe('amounts (B132)', () => {
    const withElements = (elements: Record<string, unknown>) =>
        parseEdition({ ...valid(), elements });

    it('accepts the amounts of a space within 20%', () => {
        const result = withElements({
            'space.01': { amounts: { price: 72, 'rent.5': 200, mortgage: 24 } },
            'space.00': { amounts: { salary: 160 } },
            'space.04': { amounts: { amount: 240 } },
        });
        expect(result.ok).toBe(true);
        expect(
            result.ok ? result.value.elements['space.01']?.amounts : undefined,
        ).toEqual({ price: 72, 'rent.5': 200, mortgage: 24 });
    });

    it('accepts custom amounts and an icon on the same space (B136)', () => {
        const result = withElements({
            'space.05': {
                amounts: { 'rent.3': 240 },
                icon: { preset: 'ferry' },
            },
            'space.04': {
                amounts: { amount: 160 },
                icon: { preset: 'piggy-bank' },
            },
        });
        expect(result.ok).toBe(true);
        expect(
            result.ok ? result.value.elements['space.05'] : undefined,
        ).toEqual({
            amounts: { 'rent.3': 240 },
            icon: { preset: 'ferry' },
        });
    });

    it.each([
        ['a price above 120%', { price: 73 }, 'between 48 and 72'],
        ['a rent below 80%', { 'rent.0': 1 }, 'between 2 and 2'],
        ['half an amount', { price: 60.5 }, 'whole number'],
        ['an amount the space does not have', { salary: 200 }, 'not an amount'],
    ])('rejects %s', (_label, amounts, fragment) => {
        const result = withElements({ 'space.01': { amounts } });
        expect(result.ok).toBe(false);
        expect(result.ok ? '' : result.errors.join('\n')).toContain(fragment);
    });

    it('pulls an old card amount into the range and drops one on a card without money', () => {
        const result = withElements({
            'card.chest.03': { amount: -500 },
            'card.chance.01': { amount: 75 },
        });
        expect(result.ok).toBe(true);
        expect(
            result.ok ? result.value.elements['card.chest.03'] : undefined,
        ).toEqual({ amount: -60 });
        expect(
            result.ok ? result.value.elements['card.chance.01'] : undefined,
        ).toEqual({});
    });

    it('keeps a card amount that goes the other way than the standard card (R5-11)', () => {
        const result = withElements({
            'card.chest.11': { amount: 100 },
            'card.chance.07': { amount: -55 },
        });
        expect(result.ok).toBe(true);
        expect(
            result.ok ? result.value.elements['card.chest.11'] : undefined,
        ).toEqual({ amount: 100 });
        expect(
            result.ok ? result.value.elements['card.chance.07'] : undefined,
        ).toEqual({ amount: -55 });
    });

    it('limits the purpose of a card', () => {
        const result = withElements({
            'card.chest.03': { purpose: 'x'.repeat(61) },
        });
        expect(result.ok).toBe(false);
    });
});

describe('parseOverride', () => {
    it('counts the extra print items as off in an edition stored before they existed (B129)', () => {
        const input = valid();
        const parts = isRecord(input.parts) ? { ...input.parts } : {};

        for (const id of ['rulesBooklet', 'foldModels', 'dice', 'invitation']) {
            delete parts[id];
        }

        const result = parseEdition({ ...input, parts });

        expect(result.ok).toBe(true);
        expect(result.ok ? result.value.parts.invitation : undefined).toBe(
            false,
        );
        // The dice and the houses and hotels are gone (B200): an old edition that has them on still opens.
        const old = parseEdition({
            ...input,
            parts: { ...parts, dice: true, foldModels: true },
            elements: { dice: { photo: { photoId: 'x' } }, fold_models: {} },
        });
        expect(old.ok).toBe(true);
        expect(old.ok ? Object.keys(old.value.parts) : []).not.toContain(
            'dice',
        );
        expect(old.ok ? Object.keys(old.value.elements) : ['x']).toEqual([]);

        const errors: string[] = [];
        // The invitation takes a headline and a line above it (B169), but no colour.
        parseOverride(
            'invitation',
            { text: 'Zaterdag', color: '#FFFFFF' },
            errors,
        );
        expect(errors).not.toEqual([]);
    });

    it('accepts a layout from an older edition and drops it (B122)', () => {
        const errors: string[] = [];
        expect(
            parseOverride('space.01', { name: 'A', layout: 'full' }, errors),
        ).toEqual({ name: 'A' });
        expect(errors).toEqual([]);
    });

    it('accepts a town on a colour group and nowhere else', () => {
        const errors: string[] = [];

        expect(
            parseOverride('group.brown', { town: 'Zwolle' }, errors),
        ).toEqual({ town: 'Zwolle' });
        expect(errors).toEqual([]);
        expect(
            parseOverride('space.01', { town: 'Zwolle' }, errors),
        ).toBeUndefined();
        expect(
            parseOverride('group.brown', { name: 'Zwolle' }, errors),
        ).toBeUndefined();
        expect(
            parseOverride('group.brown', { town: 'x'.repeat(500) }, errors),
        ).toBeUndefined();
        expect(errors).toHaveLength(3);
    });

    it('limits text length', () => {
        const errors: string[] = [];
        expect(
            parseOverride('space.01', { name: 'x'.repeat(500) }, errors),
        ).toBeUndefined();
        expect(errors).toHaveLength(1);
    });

    it('ignores fields that are undefined', () => {
        const errors: string[] = [];
        expect(
            parseOverride('space.01', { name: 'A', layout: undefined }, errors),
        ).toEqual({ name: 'A' });
        expect(errors).toEqual([]);
    });

    it('rejects layers with a wrong shape', () => {
        const errors: string[] = [];
        parseOverride(
            'box_lid',
            {
                layers: [
                    { id: 'a', kind: 'sticker', x: 0, y: 0, w: 1, h: 1 },
                    5,
                ],
            },
            errors,
        );
        expect(errors.length).toBe(2);
    });
});
