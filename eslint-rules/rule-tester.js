import path from 'node:path';

import { RuleTester } from 'eslint';
import typescript from 'typescript-eslint';

import { SOURCE } from './source.js';

export const tester = new RuleTester({
    languageOptions: {
        parser: typescript.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
});

export const inSource = (file) => path.join(process.cwd(), SOURCE, file);
