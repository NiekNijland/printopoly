import { inSource, tester } from './rule-tester.js';
import { testsPlugin } from './tests.js';

const filename = inSource('lib/http.test.ts');
const options = [{ max: 5 }];
const statements = (count) =>
    Array.from(
        { length: count },
        (_, index) => `    expect(${index}).toBe(${index});`,
    );
const block = (head, lines) => `${head}\n${lines.join('\n')}\n});`;
const long = [{ messageId: 'long', data: { max: 5, lines: 6 } }];

tester.run('tests/max-test-lines', testsPlugin.rules['max-test-lines'], {
    valid: [
        block("it('fits', () => {", statements(3)),
        block("it('fits with air', () => {", [
            ...statements(3),
            '',
            '    // a comment line is not counted',
            '    /* nor is a block',
            '       comment */',
        ]),
        block("describe('a long group', () => {", statements(20)),
        block("bench('a long benchmark', () => {", statements(20)),
        "it('has no body');",
    ].map((code) => ({ code, filename, options })),
    invalid: [
        block("it('is long', () => {", statements(4)),
        block("test('is long', () => {", statements(4)),
        block("it.each([1])('is long %s', () => {", statements(4)),
        block("test.concurrent('is long', async () => {", statements(4)),
        block("it('is long', function () {", statements(4)),
        block("it('is long', () => {", [
            ...statements(3),
            '    const value = 1; // a trailing comment counts',
        ]),
    ].map((code) => ({ code, filename, options, errors: long })),
});
