import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    js.configs.recommended,
    reactHooks.configs.flat.recommended,
    ...typescript.configs.recommended,
    {
        ...react.configs.flat.recommended,
        ...react.configs.flat['jsx-runtime'], // Required for React 17+
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        // Public pages must reach WCAG AA (B73, B98).
        files: ['resources/js/**/*.tsx'],
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
            'react-hooks/exhaustive-deps': 'error',
        },
    },
    ...typescript.configs.recommendedTypeChecked.map((config) => ({
        ...config,
        files: ['resources/js/**/*.{ts,tsx}'],
    })),
    {
        files: ['resources/js/**/*.{ts,tsx}'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': [
                'error',
                { checksVoidReturn: { attributes: false } },
            ],
        },
    },
    {
        files: ['resources/js/**/*.test.{ts,tsx}'],
        ...vitest.configs.recommended,
        languageOptions: {
            ...vitest.configs.env.languageOptions,
        },
    },
    {
        // The SSR entry runs in Node, not the browser.
        files: ['resources/js/ssr.tsx'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        // Build and check scripts run in Node.
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        ignores: [
            '.claude',
            'vendor',
            'node_modules',
            'public',
            'storage',
            'bootstrap/ssr',
            'coverage',
            'docs',
            'vite.config.ts',
            'vitest.config.ts',
            'resources/js/actions/**',
            'resources/js/routes/**',
            'resources/js/wayfinder/**',
            'resources/js/types/generated.ts',
        ],
    },
    prettier, // Turn off all rules that might conflict with Prettier
];
