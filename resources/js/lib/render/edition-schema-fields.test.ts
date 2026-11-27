import { describe, expect, it } from 'vitest';

import { parseKey } from './edition-keys';
import { parseOverride } from './edition-schema';
import { parseField, type FieldContext } from './edition-schema-fields';
import { TITLE_STYLES } from './edition-types';

const context = (key: string, field: string): FieldContext => {
    const parsed = parseKey(key);
    if (parsed === null) {
        throw new TypeError(`no key ${key}`);
    }

    return { key, parsed, at: `${key}.${field}`, errors: [] };
};

describe('parseField', () => {
    it('returns the value of a valid field and leaves the errors alone', () => {
        const at = context('space.01', 'name');

        expect(parseField('name', 'Dorpsstraat', at)).toBe('Dorpsstraat');
        expect(at.errors).toEqual([]);
    });

    it('reports a wrong value under the key and field', () => {
        const at = context('board_center', 'titleScale');

        expect(parseField('titleScale', 0.2, at)).toBeUndefined();
        expect(at.errors).toEqual([
            'board_center.titleScale: must be a number from 0.5 to 1',
        ]);
    });

    it('drops an old amount on a card without money without an error (B132)', () => {
        const at = context('card.chance.01', 'amount');

        expect(parseField('amount', 50, at)).toBeUndefined();
        expect(at.errors).toEqual([]);
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
        expect(check('words.bank', { name: 'De club' }).out).toEqual({
            name: 'De club',
        });
        // The old key is no element any more; parseEdition moves it first (B148).
        expect(check('bank', { name: 'De club' }).errors).toEqual([
            'bank: unknown element key',
        ]);
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

    it('accepts a title style on the board centre and the box lid only (Niek, 22 nov)', () => {
        for (const titleStyle of TITLE_STYLES) {
            expect(check('board_center', { titleStyle }).out).toEqual({
                titleStyle,
            });
            expect(check('box_lid', { titleStyle }).out).toEqual({
                titleStyle,
            });
        }
        expect(
            check('board_center', { titleStyle: 'neon' }).errors,
        ).not.toEqual([]);
        expect(check('box_lid', { titleStyle: 2 }).errors).not.toEqual([]);
        expect(
            check('card_back.chance', { titleStyle: 'stamp' }).errors,
        ).not.toEqual([]);
    });

    it('accepts the style of a part on its own style key only (B268)', () => {
        for (const style of ['vintage', 'modern', 'playful']) {
            expect(check('style.board', { style }).out).toEqual({ style });
        }
        expect(check('style.board', { style: 'neon' }).errors).not.toEqual([]);
        // The cards and the deeds have the same three (B269).
        for (const style of ['vintage', 'modern', 'playful']) {
            expect(check('style.cards', { style }).out).toEqual({ style });
            expect(check('style.deeds', { style }).out).toEqual({ style });
        }
        expect(check('style.cards', { style: 'neon' }).errors).not.toEqual([]);
        expect(check('style.dice', { style: 'vintage' }).errors).not.toEqual(
            [],
        );
        expect(check('space.01', { style: 'vintage' }).errors).not.toEqual([]);
        expect(check('style.board', { color: '#FFFFFF' }).errors).not.toEqual(
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
