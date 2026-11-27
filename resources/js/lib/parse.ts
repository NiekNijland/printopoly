export type Parsed<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: string };

export type Parser<T> = (input: unknown) => Parsed<T>;

type Literal = string | number | boolean | null;

const OPTIONAL = Symbol('optional');

type OptionalParser<T> = Parser<T | undefined> & {
    readonly [OPTIONAL]: true;
};

type Shape = Readonly<Record<string, Parser<unknown>>>;

type Output<P> = P extends Parser<infer T> ? T : never;

type RequiredKeys<S extends Shape> = {
    [K in keyof S]: S[K] extends OptionalParser<unknown> ? never : K;
}[keyof S];

type OptionalKeys<S extends Shape> = Exclude<keyof S, RequiredKeys<S>>;

type Flat<T> = { [K in keyof T]: T[K] } & {};

export type ShapeOf<S extends Shape> = Flat<
    { [K in RequiredKeys<S>]: Output<S[K]> } & {
        [K in OptionalKeys<S>]?: Output<S[K]>;
    }
>;

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });

const fail = (error: string): Parsed<never> => ({ ok: false, error });

const describe = (input: unknown): string => {
    if (input === null) {
        return 'null';
    }

    return Array.isArray(input) ? 'an array' : typeof input;
};

const expected = (what: string, input: unknown): Parsed<never> =>
    fail(`expected ${what}, got ${describe(input)}`);

const at = (path: string, error: string): string =>
    error.startsWith('expected') ? `${path}: ${error}` : `${path}.${error}`;

export const string: Parser<string> = (input) =>
    typeof input === 'string' ? ok(input) : expected('a string', input);

export const number: Parser<number> = (input) =>
    typeof input === 'number' ? ok(input) : expected('a number', input);

export const finiteNumber: Parser<number> = (input) =>
    typeof input === 'number' && Number.isFinite(input)
        ? ok(input)
        : expected('a finite number', input);

export const boolean: Parser<boolean> = (input) =>
    typeof input === 'boolean' ? ok(input) : expected('a boolean', input);

export const anything: Parser<unknown> = (input) => ok(input);

export const oneOf = <const V extends Literal>(
    values: readonly V[],
): Parser<V> => {
    return (input) => {
        const found = values.find((value) => value === input);

        return found === undefined
            ? fail(`expected one of ${values.join(', ')}, got ${String(input)}`)
            : ok(found);
    };
};

const isKey = <K extends string>(
    keys: Readonly<Record<K, unknown>>,
    input: unknown,
): input is K => typeof input === 'string' && Object.hasOwn(keys, input);

export const keyOf = <K extends string>(
    keys: Readonly<Record<K, unknown>>,
): Parser<K> => {
    return (input) =>
        isKey(keys, input)
            ? ok(input)
            : fail(
                  `expected a key of ${Object.keys(keys).join(', ')}, got ${String(input)}`,
              );
};

export const literal = <const V extends Literal>(value: V): Parser<V> =>
    oneOf([value]);

export const instanceOf = <T>(
    type: abstract new (...args: never[]) => T,
): Parser<T> => {
    return (input) =>
        input instanceof type ? ok(input) : expected(type.name, input);
};

export const nullable = <T>(parser: Parser<T>): Parser<T | null> => {
    return (input) => (input === null ? ok(null) : parser(input));
};

export const optional = <T>(parser: Parser<T>): OptionalParser<T> => {
    const read: Parser<T | undefined> = (input) =>
        input === undefined ? ok(undefined) : parser(input);

    return Object.assign(read, { [OPTIONAL]: true as const });
};

export const array = <T>(item: Parser<T>): Parser<T[]> => {
    return (input) => {
        if (!Array.isArray(input)) {
            return expected('an array', input);
        }
        const items: T[] = [];
        for (const [index, value] of input.entries()) {
            const parsed = item(value);
            if (!parsed.ok) {
                return fail(at(`[${String(index)}]`, parsed.error));
            }
            items.push(parsed.value);
        }

        return ok(items);
    };
};

const isPlainObject = (input: unknown): input is Record<string, unknown> =>
    typeof input === 'object' && input !== null && !Array.isArray(input);

const fieldOf = (input: Record<string, unknown>, key: string): unknown =>
    Object.hasOwn(input, key) ? input[key] : undefined;

export const dictionary = <T>(value: Parser<T>): Parser<Record<string, T>> => {
    return (input) => {
        if (!isPlainObject(input)) {
            return expected('an object', input);
        }
        const out: Record<string, T> = {};
        for (const key of Object.keys(input)) {
            const parsed = value(fieldOf(input, key));
            if (!parsed.ok) {
                return fail(at(key, parsed.error));
            }
            out[key] = parsed.value;
        }

        return ok(out);
    };
};

export const object: Parser<Record<string, unknown>> = (input) =>
    isPlainObject(input) ? ok(input) : expected('an object', input);

// docs/decisions/0011-typepredicaten.md: the one narrowing the compiler does not check.
const checked = <T>(input: unknown, failures: readonly string[]): input is T =>
    failures.length === 0 && isPlainObject(input);

export const record = <S extends Shape>(shape: S): Parser<ShapeOf<S>> => {
    return (input) => {
        if (!isPlainObject(input)) {
            return expected('an object', input);
        }
        const failures: string[] = [];
        for (const [key, field] of Object.entries(shape)) {
            const parsed = field(fieldOf(input, key));
            if (!parsed.ok) {
                failures.push(at(key, parsed.error));
            }
        }

        return checked<ShapeOf<S>>(input, failures)
            ? ok(input)
            : fail(failures.join('; '));
    };
};

export const union = <T>(...parsers: readonly Parser<T>[]): Parser<T> => {
    return (input) => {
        const errors: string[] = [];
        for (const parser of parsers) {
            const parsed = parser(input);
            if (parsed.ok) {
                return parsed;
            }
            errors.push(parsed.error);
        }

        return fail(`no match (${errors.join(' | ')})`);
    };
};

export const is = <T>(parser: Parser<T>, input: unknown): input is T =>
    parser(input).ok;

export const parseOrUndefined = <T>(
    parser: Parser<T>,
    input: unknown,
): T | undefined => {
    const parsed = parser(input);

    return parsed.ok ? parsed.value : undefined;
};

export const validItems = <T>(parser: Parser<T>, input: unknown): T[] => {
    return Array.isArray(input)
        ? input.flatMap((item: unknown) => {
              const parsed = parser(item);

              return parsed.ok ? [parsed.value] : [];
          })
        : [];
};
