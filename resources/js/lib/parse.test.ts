import {
    anything,
    array,
    boolean,
    dictionary,
    finiteNumber,
    instanceOf,
    is,
    keyOf,
    literal,
    nullable,
    number,
    object,
    oneOf,
    optional,
    parseOrUndefined,
    record,
    string,
    union,
    validItems,
    type Parser,
} from './parse';

type Note = { title: string; pages?: number; size: number | null };
const note: Parser<Note> = record({
    title: string,
    pages: optional(number),
    size: nullable(number),
});

type Shape = { kind: 'circle'; r: number } | { kind: 'dot' };
const shape = union<Shape>(
    record({ kind: literal('circle'), r: number }),
    record({ kind: literal('dot') }),
);

describe('parse', () => {
    it('reads each primitive and names what it got otherwise', () => {
        expect(string('a')).toEqual({ ok: true, value: 'a' });
        expect(string(1)).toEqual({
            ok: false,
            error: 'expected a string, got number',
        });
        expect(number(Number.NaN).ok).toBe(true);
        expect(number('1')).toEqual({
            ok: false,
            error: 'expected a number, got string',
        });
        expect(finiteNumber(2).ok).toBe(true);
        expect(finiteNumber(Number.POSITIVE_INFINITY).ok).toBe(false);
        expect(boolean(false)).toEqual({ ok: true, value: false });
        expect(boolean(null)).toEqual({
            ok: false,
            error: 'expected a boolean, got null',
        });
        expect(anything(undefined)).toEqual({ ok: true, value: undefined });
    });

    it('reads one of a list of values', () => {
        const locale = oneOf(['nl', 'en']);

        expect(locale('en')).toEqual({ ok: true, value: 'en' });
        expect(locale('de')).toEqual({
            ok: false,
            error: 'expected one of nl, en, got de',
        });
        expect(oneOf([null, 0])(null)).toEqual({ ok: true, value: null });
        expect(literal(2)(2).ok).toBe(true);
    });

    it('reads a key of a record, not one it inherits', () => {
        const sizes = keyOf({ small: 1, large: 2 });

        expect(sizes('large')).toEqual({ ok: true, value: 'large' });
        expect(sizes('toString')).toEqual({
            ok: false,
            error: 'expected a key of small, large, got toString',
        });
        expect(sizes(1).ok).toBe(false);
    });

    it('reads an instance of a class', () => {
        const blob = new Blob(['x']);

        expect(instanceOf(Blob)(blob)).toEqual({ ok: true, value: blob });
        expect(instanceOf(Blob)('x')).toEqual({
            ok: false,
            error: 'expected Blob, got string',
        });
    });

    it('reads a list item by item and says which item broke', () => {
        expect(array(number)([1, 2])).toEqual({ ok: true, value: [1, 2] });
        expect(array(number)({})).toEqual({
            ok: false,
            error: 'expected an array, got object',
        });
        expect(array(array(number))([[1], [2, 'x']])).toEqual({
            ok: false,
            error: '[1].[1]: expected a number, got string',
        });
    });

    it('reads a record with every field the type names', () => {
        const value = { title: 'A', pages: 3, size: null };

        expect(note(value)).toEqual({ ok: true, value });
        expect(note({ title: 'A', size: 2 }).ok).toBe(true);
        expect(note({ title: 'A', pages: undefined, size: 2 }).ok).toBe(true);
    });

    it('refuses a record with a missing field or a field of the wrong type', () => {
        expect(note({ title: 'A' })).toEqual({
            ok: false,
            error: 'size: expected a number, got undefined',
        });
        expect(note({ title: 1, pages: '2', size: null })).toEqual({
            ok: false,
            error: 'title: expected a string, got number; pages: expected a number, got string',
        });
        expect(note([]).ok).toBe(false);
        expect(note(null).ok).toBe(false);
        expect(record({ inner: note })({ inner: { title: 'A' } })).toEqual({
            ok: false,
            error: 'inner.size: expected a number, got undefined',
        });
    });

    it('keeps a field the type does not name, unchecked', () => {
        const value = { title: 'A', size: 1, extra: Symbol('x') };
        const parsed = note(value);

        expect(parsed.ok && parsed.value).toBe(value);
    });

    it('reads only own fields, not inherited ones', () => {
        const inherited: unknown = Object.create({ title: 'A', size: 1 });

        expect(note(inherited).ok).toBe(false);
    });

    it('reads a dictionary and an object of unchecked values', () => {
        expect(dictionary(number)({ a: 1, b: 2 })).toEqual({
            ok: true,
            value: { a: 1, b: 2 },
        });
        expect(dictionary(number)({ a: 1, b: 'x' })).toEqual({
            ok: false,
            error: 'b: expected a number, got string',
        });
        expect(dictionary(number)([1])).toEqual({
            ok: false,
            error: 'expected an object, got an array',
        });
        expect(object({ a: 'x' }).ok).toBe(true);
        expect(object('x').ok).toBe(false);
    });

    it('reads the first member of a union that fits', () => {
        expect(shape({ kind: 'circle', r: 2 }).ok).toBe(true);
        expect(shape({ kind: 'dot' }).ok).toBe(true);
        expect(shape({ kind: 'circle' })).toEqual({
            ok: false,
            error: 'no match (r: expected a number, got undefined | kind: expected one of dot, got circle)',
        });
    });

    it('narrows with is, and answers the value or undefined', () => {
        const input: unknown = { title: 'A', size: 1 };

        expect(is(note, input) && input.title).toBe('A');
        expect(is(note, 'x')).toBe(false);
        expect(parseOrUndefined(note, input)).toBe(input);
        expect(parseOrUndefined(note, 'x')).toBeUndefined();
    });

    it('keeps the items of a list that read', () => {
        expect(validItems(number, [1, 'x', 2])).toEqual([1, 2]);
        expect(validItems(number, 'x')).toEqual([]);
    });
});
