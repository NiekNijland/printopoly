import fs from 'node:fs';

import { builtinRules } from 'eslint/use-at-your-own-risk';
import { expect, it } from 'vitest';

import { inSource, tester } from './rule-tester.js';
import {
    generatedUnionRules,
    sourceSyntaxRules,
    testingSyntaxRules,
    testSyntaxRules,
} from './syntax.js';

const restrictedSyntax = builtinRules.get('no-restricted-syntax');
const messageOf = (rules, part) => {
    const rule = rules.find(({ message }) => message.includes(part));
    if (rule === undefined) {
        throw new Error(`No selector says "${part}"`);
    }

    return rule.message;
};
const run = (name, rules, filename, valid, invalid) =>
    tester.run(name, restrictedSyntax, {
        valid: valid.map((code) => ({ code, filename, options: rules })),
        invalid: invalid.map(([code, part]) => ({
            code,
            filename,
            options: rules,
            errors: [{ message: messageOf(rules, part) }],
        })),
    });

const [, union, values] =
    /^export type (\w+) = ('[^']+'(?: \| '[^']+')+);$/m.exec(
        fs.readFileSync(inSource('types/generated.ts'), 'utf8'),
    ) ?? [];

it('reads a backend enum from the generated types', () => {
    expect(generatedUnionRules.length).toBeGreaterThan(0);
    expect(union).toBeDefined();
});

const runner = ['it', 'test', 'describe'];

run(
    'no-restricted-syntax (source)',
    sourceSyntaxRules,
    inSource('features/edition/sync.tsx'),
    [
        'const Card = ({ name }: Props) => <p>{name}</p>;',
        'function sum(a: number, b: number) { return a + b; }',
        'const useThing = () => useState(0);',
        'useState(0);',
        "const Kind = { a: 'a' } as const;",
        'export const a = 1;',
        'const name = value as string;',
        'usePage();',
        'const save = useHttp();',
        'setInterval(() => tick(), 1000);',
        'useEffect(() => { load(); }, []);',
        'const stop = () => { clearTimeout(timer); };',
        `type Mine = 'a' | 'not-a-generated-value';`,
        "it('works', () => {});",
        'expect(value).toBe(1);',
    ],
    [
        ['function Card() { return <p />; }', 'A component is a const arrow'],
        ['function useThing() { return 1; }', 'A hook is a const arrow'],
        ['const x = function useThing() {};', 'A hook is a const arrow'],
        ['React.useState(0);', 'Import a React hook by name'],
        ['enum Kind { A }', 'No hand-written enum'],
        ['forwardRef(() => null);', 'Take ref as a prop'],
        ['React.forwardRef(() => null);', 'Take ref as a prop'],
        ["export * from './a';", 'No re-export'],
        ["export { a } from './a';", 'No re-export'],
        ['const name = value as unknown as string;', 'No `as unknown as`'],
        ['usePage<Props>();', 'Do not type usePage'],
        ['const http = useHttp();', 'Name a useHttp instance'],
        ["setInterval(() => { fetch('/x'); }, 1000);", 'Poll a page prop'],
        ['window.setTimeout(() => router.reload(), 10);', 'Poll a page prop'],
        ["useEffect(() => { fetch('/x'); }, []);", 'Read JSON for a component'],
        [
            "useLayoutEffect(() => { fetch('/x'); }, []);",
            'Read JSON for a component',
        ],
        [
            'const later = () => { clearTimeout(timer); timer = setTimeout(save, 300); };',
            'Debounce with the one debounce hook',
        ],
        [`type Mine = ${values};`, `Use the generated ${union}`],
        ...runner.map((name) => [
            `${name}.only('x', () => {});`,
            'No focused, skipped',
        ]),
        ...['fit', 'xit', 'xtest', 'fdescribe', 'xdescribe'].map((name) => [
            `${name}('x', () => {});`,
            'No focused, skipped',
        ]),
        ['expect(value).toMatchSnapshot();', 'No snapshot test'],
        ['expect(value).toMatchInlineSnapshot();', 'No snapshot test'],
    ],
);

run(
    'no-restricted-syntax (tests)',
    testSyntaxRules,
    inSource('features/edition/sync.test.tsx'),
    [
        "vi.mock('@/lib/http');",
        'const page = { useForm: createUseForm() };',
        'const http = useHttp();',
        "it('works', () => {});",
        'await new Promise((resolve) => setTimeout(resolve, 0));',
        'await new Promise((resolve) => setTimeout(resolve));',
        'setTimeout(done, 50);',
    ],
    [
        [
            "vi.mock('@inertiajs/react');",
            'Use the shared fake of @inertiajs/react',
        ],
        [
            "vi.doMock('@inertiajs/react', () => ({}));",
            'Use the shared fake of @inertiajs/react',
        ],
        [
            "vi.mock(import('@inertiajs/react'));",
            'Use the shared fake of @inertiajs/react',
        ],
        ['const page = { useForm: () => ({}) };', 'Fake useForm with the one'],
        ...runner.map((name) => [
            `${name}.skip('x', () => {});`,
            'No focused, skipped',
        ]),
        ['function Card() { return <p />; }', 'A component is a const arrow'],
        [
            'await new Promise((resolve) => setTimeout(resolve, 50));',
            'No real-time wait in a test',
        ],
        [
            'const sleep = (ms) => new Promise((done) => window.setTimeout(done, ms));',
            'No real-time wait in a test',
        ],
    ],
);

run(
    'no-restricted-syntax (test helpers)',
    testingSyntaxRules,
    inSource('testing/edition-test-utils.ts'),
    [
        'await new Promise((resolve) => setTimeout(resolve, 0));',
        'export const a = 1;',
    ],
    [
        [
            'await new Promise((resolve) => setTimeout(resolve, 10));',
            'No real-time wait in a test',
        ],
        ['enum Kind { A }', 'No hand-written enum'],
    ],
);
