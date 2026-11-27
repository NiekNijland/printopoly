import { predicateDoors, predicatesPlugin } from './predicates.js';
import { inSource, tester } from './rule-tester.js';

const rule = predicatesPlugin.rules['no-type-predicate'];
const elsewhere = inSource('features/edition/bus.ts');
const [[doorName, doorFile]] = Object.entries(predicateDoors);
const predicate = [{ messageId: 'predicate' }];

tester.run('predicates/no-type-predicate', rule, {
    valid: [
        {
            code: 'const is = <T>(parser: Parser<T>, input: unknown): input is T => parser(input).ok;',
            filename: inSource('lib/parse.ts'),
        },
        {
            code: `const ${doorName} = (value: unknown): value is Elements => true;`,
            filename: inSource(doorFile),
        },
        {
            code: 'const isText = (value: unknown) => typeof value === "string";',
            filename: elsewhere,
        },
        {
            code: 'items.filter((item) => item !== null);',
            filename: elsewhere,
        },
        {
            code: 'function check(value: unknown): asserts value { if (!value) throw new Error(); }',
            filename: elsewhere,
        },
    ],
    invalid: [
        'const isText = (value: unknown): value is string => true;',
        'function isText(value: unknown): value is string { return true; }',
        'items.filter((item): item is string => item !== null);',
        'class A { isText(value: unknown): value is string { return true; } }',
        'type Check = (value: unknown) => value is string;',
        'function check(value: unknown): asserts value is string {}',
        `const ${doorName} = (value: unknown): value is Elements => true;`,
    ]
        .map((code) => ({ code, filename: elsewhere, errors: predicate }))
        .concat([
            {
                code: 'const isOther = (value: unknown): value is Elements => true;',
                filename: inSource(doorFile),
                errors: predicate,
            },
        ]),
});
