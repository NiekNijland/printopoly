import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { parseEdition, parseOverride } from './schema';
import { makeEdition, photo } from './test-utils';

const valid = () =>
    JSON.parse(
        JSON.stringify({
            ...makeEdition(),
            elements: {
                'space.01': {
                    name: 'Stadspark',
                    photo: photo(),
                },
                'card.chance.03': { text: 'Neem een taartje.', amount: 20 },
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
        }),
    ) as Record<string, unknown>;

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

describe('parseOverride', () => {
    it('counts the extra print items as off in an edition stored before they existed (B129)', () => {
        const input = valid();
        const parts = { ...(input.parts as Record<string, boolean>) };

        for (const id of ['rulesBooklet', 'foldModels', 'dice', 'invitation']) {
            delete parts[id];
        }

        const result = parseEdition({ ...input, parts });

        expect(result.ok).toBe(true);
        expect(result.ok ? result.value.parts.dice : undefined).toBe(false);

        const errors: string[] = [];
        parseOverride('invitation', { text: 'Zaterdag', name: 'x' }, errors);
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

describe('fields of the editor gaps', () => {
    const check = (key: string, value: unknown) => {
        const errors: string[] = [];

        return { out: parseOverride(key, value, errors), errors };
    };

    it('accepts a note colour, a hidden pawn, a bank name and a layer rotation', () => {
        expect(check('note.100', { color: '#A1b2C3' }).out).toEqual({
            color: '#A1b2C3',
        });
        expect(check('pawn.02', { hidden: true }).out).toEqual({
            hidden: true,
        });
        expect(check('bank', { name: 'De club' }).out).toEqual({
            name: 'De club',
        });
        const layer = {
            id: 'l1',
            kind: 'text',
            text: 'Hoi',
            x: 0,
            y: 0,
            w: 10,
            h: 5,
            rotation: -45,
        };
        expect(check('board_center', { layers: [layer] }).out).toEqual({
            layers: [layer],
        });
    });

    it('accepts the title options of the board centre and nowhere else (B125)', () => {
        const options = {
            centerMode: 'photo',
            subtitle: '',
            photoAspect: 1.5,
            photoFrame: false,
        };

        expect(check('board_center', options).out).toEqual(options);
        expect(check('box_lid', { centerMode: 'logo' }).errors).not.toEqual([]);
        expect(
            check('board_center', { centerMode: 'sticker' }).errors,
        ).not.toEqual([]);
        expect(check('board_center', { photoAspect: 0 }).errors).not.toEqual(
            [],
        );
        expect(check('board_center', { photoAspect: 99 }).errors).not.toEqual(
            [],
        );
        expect(check('board_center', { photoFrame: 'no' }).errors).not.toEqual(
            [],
        );
    });

    it('accepts a background photo on the board centre only (B125)', () => {
        const background = {
            photoId: 'p1',
            cx: 0.5,
            cy: 0.5,
            scale: 1,
            rotation: 0,
            grayscale: false,
        };

        expect(check('board_center', { background }).out).toEqual({
            background,
        });
        expect(check('box_lid', { background }).errors).not.toEqual([]);
        expect(
            check('board_center', { background: { photoId: '' } }).errors,
        ).not.toEqual([]);
    });

    it('rejects a bad colour, a bad rotation and fields on the wrong element', () => {
        expect(check('note.100', { color: 'red' }).errors).not.toEqual([]);
        expect(check('note.100', { color: '#abc' }).errors).not.toEqual([]);
        expect(check('pawn.02', { hidden: 'yes' }).errors).not.toEqual([]);
        expect(
            check('card.chance.01', { color: '#A1B2C3' }).errors,
        ).not.toEqual([]);
        expect(check('bank', { text: 'x' }).errors).not.toEqual([]);
        expect(
            check('box_lid', {
                layers: [
                    {
                        id: 'l',
                        kind: 'text',
                        text: 'x',
                        x: 0,
                        y: 0,
                        w: 1,
                        h: 1,
                        rotation: 'left',
                    },
                ],
            }).errors,
        ).not.toEqual([]);
    });
});

describe('photoStyle (B124)', () => {
    it('accepts framed and full on elements with a photo', () => {
        for (const key of [
            'space.01',
            'deed.01',
            'card.chance.01',
            'note.5',
            'pawn.01',
            'box_lid',
        ]) {
            for (const style of ['framed', 'full'] as const) {
                const errors: string[] = [];

                expect(
                    parseOverride(key, { photoStyle: style }, errors),
                ).toEqual({ photoStyle: style });
                expect(errors).toEqual([]);
            }
        }
    });

    it('rejects other values and elements that have no choice', () => {
        const errors: string[] = [];

        expect(
            parseOverride('space.01', { photoStyle: 'wide' }, errors),
        ).toBeUndefined();
        expect(errors).toEqual([
            'space.01.photoStyle: must be "framed" or "full"',
        ]);

        const other: string[] = [];

        expect(
            parseOverride('card_back.chance', { photoStyle: 'full' }, other),
        ).toBeUndefined();
        expect(other[0]).toContain('not allowed here');
    });

    it('still drops a layout from an older edition next to it', () => {
        const errors: string[] = [];

        expect(
            parseOverride(
                'space.01',
                { layout: 'text', photoStyle: 'full' },
                errors,
            ),
        ).toEqual({ photoStyle: 'full' });
        expect(errors).toEqual([]);
    });
});

describe('style fields (B130)', () => {
    it('accepts a colour on a group and on the accent, and a pattern on a card back', () => {
        const errors: string[] = [];

        expect(
            parseOverride('group.red', { color: '#C8321F' }, errors),
        ).toEqual({ color: '#C8321F' });
        expect(
            parseOverride('theme_accent', { color: '#00A3E0' }, errors),
        ).toEqual({ color: '#00A3E0' });
        expect(
            parseOverride('card_back.chance', { pattern: 'dots' }, errors),
        ).toEqual({ pattern: 'dots' });
        expect(errors).toEqual([]);
    });

    it('rejects an unknown pattern and a colour that is not hex', () => {
        const errors: string[] = [];

        expect(
            parseOverride('card_back.chance', { pattern: 'swirl' }, errors),
        ).toBeUndefined();
        expect(
            parseOverride('group.red', { color: 'red' }, errors),
        ).toBeUndefined();
        expect(errors).toHaveLength(2);
    });

    it('keeps the style fields off elements that do not have them', () => {
        const errors: string[] = [];

        expect(
            parseOverride('space.01', { color: '#C8321F' }, errors),
        ).toBeUndefined();
        expect(
            parseOverride('card.chance.01', { pattern: 'dots' }, errors),
        ).toBeUndefined();
        expect(errors).toHaveLength(2);
    });
});
