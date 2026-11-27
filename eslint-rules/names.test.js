import { namesPlugin } from './names.js';
import { inSource, tester } from './rule-tester.js';

const code = 'export const a = 1;';

tester.run('names/kebab-case', namesPlugin.rules['kebab-case'], {
    valid: [
        { code, filename: inSource('lib/foo-bar.ts') },
        { code, filename: inSource('lib/foo-bar.test.ts') },
        { code, filename: inSource('components/render/board-cell.tsx') },
        { code, filename: inSource('pages/editions/index.tsx') },
        { code, filename: inSource('types/global.d.ts') },
    ],
    invalid: [
        {
            code,
            filename: inSource('lib/fooBar.ts'),
            errors: [{ messageId: 'name', data: { name: 'fooBar.ts' } }],
        },
        {
            code,
            filename: inSource('lib/foo_bar.test.ts'),
            errors: [{ messageId: 'name' }],
        },
        {
            code,
            filename: inSource('features/Edition/card.tsx'),
            errors: [{ messageId: 'name', data: { name: 'Edition' } }],
        },
        {
            code,
            filename: inSource('lib/render/index.ts'),
            errors: [{ messageId: 'barrel' }],
        },
    ],
});
