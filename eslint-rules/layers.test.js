import { layersPlugin } from './layers.js';
import { inSource, tester } from './rule-tester.js';

const code = 'export const a = 1;';
const folder = [{ messageId: 'folder' }];

tester.run('layers/final-folder', layersPlugin.rules['final-folder'], {
    valid: [
        'app.tsx',
        'print.test.tsx',
        'types/game.ts',
        'testing/fetch.ts',
        'lib/http.ts',
        'lib/render/fit-text.ts',
        'components/logo.tsx',
        'components/ui/button.tsx',
        'components/render/board.tsx',
        'features/edition/sync.ts',
        'pages/home.tsx',
    ].map((file) => ({ code, filename: inSource(file) })),
    invalid: [
        'main.tsx',
        'lib/edition/sync.ts',
        'components/edition/card.tsx',
        'features/sync.ts',
        'utils/sync.ts',
    ].map((file) => ({ code, filename: inSource(file), errors: folder })),
});

const sibling = [{ messageId: 'sibling' }];

tester.run(
    'layers/no-sibling-import',
    layersPlugin.rules['no-sibling-import'],
    {
        valid: [
            {
                code: "import { a } from '@/features/edition/sync';",
                filename: inSource('features/edition/repository.ts'),
            },
            {
                code: "import { a } from './sync';",
                filename: inSource('features/edition/repository.ts'),
            },
            {
                code: "import { a } from '@/lib/http';",
                filename: inSource('features/print/review-list.tsx'),
            },
            {
                code: "import { a } from '@/features/print/review-list';",
                filename: inSource('lib/http.ts'),
            },
            {
                code: "import { a } from './show';",
                filename: inSource('pages/print/show.test.tsx'),
            },
        ],
        invalid: [
            {
                code: "import { a } from '@/features/print/review-list';",
                filename: inSource('features/edition/repository.ts'),
                errors: sibling,
            },
            {
                code: "import { a } from '../print/review-list';",
                filename: inSource('features/edition/repository.ts'),
                errors: sibling,
            },
            {
                code: "export { a } from '@/features/print/review-list';",
                filename: inSource('features/edition/repository.ts'),
                errors: sibling,
            },
            {
                code: "export * from '@/features/print/review-list';",
                filename: inSource('features/edition/repository.ts'),
                errors: sibling,
            },
            {
                code: "import { a } from '@/pages/home';",
                filename: inSource('pages/print/show.tsx'),
                errors: sibling,
            },
        ],
    },
);
