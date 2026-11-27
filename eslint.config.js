import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

import {
    consoleRule,
    doorGlobals,
    doorProperties,
    queryVisitRule,
    reflectApplyRule,
} from './eslint-rules/doors.js';
import { downloadsPlugin } from './eslint-rules/downloads.js';
import {
    importPaths,
    layerGroups,
    layersPlugin,
    layerTable,
} from './eslint-rules/layers.js';
import { MAX_FILE_LINES, MAX_FUNCTION_LINES } from './eslint-rules/limits.js';
import { namesPlugin } from './eslint-rules/names.js';
import { navigationPlugin } from './eslint-rules/navigation.js';
import { pagesPlugin } from './eslint-rules/pages.js';
import { settledCoreRules } from './eslint-rules/settled-core.js';
import {
    settledImportRules,
    settledReactRules,
    settledTestRules,
    settledTypedRules,
} from './eslint-rules/settled-plugins.js';
import { SOURCE } from './eslint-rules/source.js';
import {
    generatedUnionRules,
    sourceSyntaxRules,
    testSyntaxRules,
} from './eslint-rules/syntax.js';
import { toastsPlugin } from './eslint-rules/toasts.js';
import { visitsPlugin } from './eslint-rules/visits.js';

const TS = `${SOURCE}/**/*.{ts,tsx}`;
const TESTS = `${SOURCE}/**/*.test.{ts,tsx}`;
// Every TypeScript file but the tests: an extglob, so no ignores list is needed.
const NOT_TESTS = `${SOURCE}/**/!(*.test).{ts,tsx}`;

// ESLint skips what git ignores (dependencies, build output, the generated route helpers), so nothing in the repository is skipped.
const gitIgnored = fs
    .readFileSync(path.resolve(import.meta.dirname, '.gitignore'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(
        (line) => line !== '' && !line.startsWith('#') && !line.startsWith('!'),
    )
    .map((line) => (line.startsWith('/') ? line.slice(1) : `**/${line}`));

const localPlugins = {
    names: namesPlugin,
    layers: layersPlugin,
    pages: pagesPlugin,
    toasts: toastsPlugin,
    visits: visitsPlugin,
    downloads: downloadsPlugin,
    navigation: navigationPlugin,
};

// eslint-plugin-react reads the installed React, so no rule depends on its version detection.
const reactVersion = createRequire(import.meta.url)(
    'react/package.json',
).version;

/** @type {import('eslint').Linter.Config[]} */
export default [
    { linterOptions: { reportUnusedDisableDirectives: 'error' } },
    js.configs.recommended,
    reactHooks.configs.flat.recommended,
    ...typescript.configs.recommended,
    {
        languageOptions: { globals: { ...globals.browser } },
        rules: { ...settledCoreRules },
    },
    {
        files: [`${SOURCE}/**/*.{ts,tsx}`],
        ...jsxA11y.flatConfigs.recommended,
        settings: {
            'jsx-a11y': {
                components: { Button: 'button', Input: 'input' },
            },
        },
    },
    {
        ...importPlugin.flatConfigs.recommended,
        settings: {
            'import/internal-regex': '^@/',
            'import/resolver': {
                typescript: true,
                node: true,
            },
        },
        rules: {
            ...settledImportRules,
            'import/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                    ],
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
        },
    },
    {
        ...importPlugin.flatConfigs.typescript,
        files: ['**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'separate-type-imports',
                },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
    ...typescript.configs.recommendedTypeChecked.map((config) => ({
        ...config,
        files: [TS],
    })),
    {
        files: [TS],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            ...settledTypedRules,
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': [
                'error',
                { checksVoidReturn: { attributes: false } },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/ban-ts-comment': 'error',
            // A type assertion tells TypeScript to stop checking; narrow instead (a type guard, satisfies, a parser).
            // `as const` is no assertion and stays allowed.
            '@typescript-eslint/consistent-type-assertions': [
                'error',
                { assertionStyle: 'never' },
            ],
            // `a || b` on a string, number or boolean means "empty falls back"; `??` would keep "" and 0.
            '@typescript-eslint/prefer-nullish-coalescing': [
                'error',
                { ignorePrimitives: true },
            ],
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
            '@typescript-eslint/no-restricted-types': [
                'error',
                {
                    types: Object.fromEntries(
                        [
                            'FC',
                            'React.FC',
                            'FunctionComponent',
                            'React.FunctionComponent',
                        ].map((name) => [
                            name,
                            {
                                message:
                                    'Type the props on the function (const X = ({ a }: Props) => ...) instead of annotating it with FC.',
                            },
                        ]),
                    ),
                },
            ],
        },
    },
    {
        files: [TS],
        plugins: { react, ...localPlugins },
        settings: { react: { version: reactVersion } },
        rules: {
            ...settledReactRules,
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error',
            'react/function-component-definition': [
                'error',
                {
                    namedComponents: 'arrow-function',
                    unnamedComponents: 'arrow-function',
                },
            ],
            // A function is a const arrow; one that needs `this` or `yield` is a function expression.
            'func-style': ['error', 'expression'],
            'no-restricted-syntax': ['error', ...sourceSyntaxRules],
            'no-restricted-imports': ['error', { paths: importPaths }],
            'no-restricted-globals': ['error', ...doorGlobals()],
            'no-restricted-properties': [
                'error',
                ...doorProperties(),
                reflectApplyRule,
            ],
            'max-lines': ['error', { max: MAX_FILE_LINES }],
            'names/kebab-case': 'error',
            'layers/final-folder': 'error',
            'layers/no-sibling-import': 'error',
            'toasts/no-success-toast': 'error',
            'visits/no-visit-state': 'error',
            'downloads/no-download-link': 'error',
            'navigation/no-location-write': 'error',
        },
    },
    // The generated types are where the backend enums are written as unions: the one file that may list their values.
    {
        files: [`${SOURCE}/types/generated.ts`],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...sourceSyntaxRules.filter(
                    (rule) => !generatedUnionRules.includes(rule),
                ),
            ],
        },
    },
    {
        files: [NOT_TESTS],
        rules: {
            'max-lines-per-function': [
                'error',
                {
                    max: MAX_FUNCTION_LINES,
                    skipBlankLines: true,
                    skipComments: true,
                    IIFEs: true,
                },
            ],
        },
    },
    {
        files: [`${SOURCE}/{components,features,layouts,pages}/**/*.{ts,tsx}`],
        rules: {
            'no-restricted-properties': [
                'error',
                ...doorProperties(),
                queryVisitRule,
                reflectApplyRule,
            ],
        },
    },
    {
        files: [`${SOURCE}/pages/**/!(*.test).tsx`],
        rules: { 'pages/destructure-props': 'error' },
    },
    // The layer table: one block per layer, after the general block, with the same paths and the layers above it.
    ...Object.entries(layerTable).map(([files, folders]) => ({
        files: [files],
        rules: {
            'no-restricted-imports': [
                'error',
                { paths: importPaths, patterns: layerGroups(folders) },
            ],
        },
    })),
    // A declaration file merges into the types of a package or of the window, which only an interface can.
    {
        files: [`${SOURCE}/types/*.d.ts`],
        rules: {
            '@typescript-eslint/consistent-type-definitions': [
                'error',
                'interface',
            ],
        },
    },
    // The doors: each file that owns an API gets the same lists without its own entry.
    {
        files: [`${SOURCE}/lib/media-query.ts`],
        rules: {
            'no-restricted-globals': ['error', ...doorGlobals(['matchMedia'])],
            'no-restricted-properties': [
                'error',
                ...doorProperties(['matchMedia']),
                reflectApplyRule,
            ],
        },
    },
    ...[
        ['lib/browser-storage.ts', ['localStorage', 'sessionStorage']],
        ['lib/bugsnag.ts', ['console']],
        ['lib/dom-events.ts', ['events']],
        ['lib/number-format.ts', ['NumberFormat']],
        ['lib/datetime.ts', ['DateTimeFormat']],
    ].map(([file, except]) => ({
        files: [`${SOURCE}/${file}`],
        rules: {
            'no-restricted-globals': ['error', ...doorGlobals(except)],
            'no-restricted-properties': [
                'error',
                ...doorProperties(except),
                reflectApplyRule,
            ],
        },
    })),
    {
        files: [
            `${SOURCE}/lib/http.ts`,
            `${SOURCE}/lib/feature-count.ts`,
            `${SOURCE}/lib/render/print-api.ts`,
            `${SOURCE}/features/edition/remote/*.ts`,
        ],
        rules: {
            'no-restricted-globals': [
                'error',
                ...doorGlobals(['fetch', 'XMLHttpRequest']),
            ],
            'no-restricted-properties': [
                'error',
                ...doorProperties(['fetch', 'XMLHttpRequest']),
                reflectApplyRule,
            ],
        },
    },
    // Tests stub storage and the router and assert on the fakes, so they get no doors; they never reach the network.
    {
        files: [TESTS],
        ...vitest.configs.recommended,
        languageOptions: {
            ...vitest.configs.env.languageOptions,
        },
        rules: {
            ...vitest.configs.recommended.rules,
            ...settledTestRules,
            'vitest/expect-expect': [
                'error',
                { assertFunctionNames: ['expect', 'expectTypeOf'] },
            ],
            'no-restricted-syntax': ['error', ...testSyntaxRules],
            'no-restricted-globals': [
                'error',
                ...doorGlobals().filter(({ name }) => name === 'fetch'),
            ],
            'no-restricted-properties': [
                'error',
                consoleRule,
                reflectApplyRule,
            ],
        },
    },
    {
        // The SSR entry runs in Node, not the browser.
        files: [`${SOURCE}/ssr.tsx`],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        // Build and check scripts and the codemods run in Node.
        files: [
            'scripts/**/*.mjs',
            'tools/**/*.mjs',
            'eslint.config.js',
            'eslint-rules/**/*.js',
        ],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        ignores: [...gitIgnored, 'docs/design'],
    },
    prettier, // Turn off all rules that might conflict with Prettier
];
