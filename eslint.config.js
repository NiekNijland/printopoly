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

const SOURCE = 'resources/js';
const TS = `${SOURCE}/**/*.{ts,tsx}`;
const TESTS = `${SOURCE}/**/*.test.{ts,tsx}`;
// Every TypeScript file but the tests: an extglob, so no ignores list is needed.
const NOT_TESTS = `${SOURCE}/**/!(*.test).{ts,tsx}`;

// The rules the whole tree is at zero for, by name, one group per kind of file, so that a preset that changes cannot
// drop one. A rule joins its group once the tree is at zero for it (docs/guards/frontend.md, "Settled rules").
const named = (prefix, names) =>
    Object.fromEntries(names.map((name) => [`${prefix}${name}`, 'error']));

const settledCoreRules = named('', [
    'array-callback-return',
    'block-scoped-var',
    'consistent-this',
    'constructor-super',
    'default-case-last',
    'default-param-last',
    'for-direction',
    'func-name-matching',
    'func-names',
    'getter-return',
    'grouped-accessor-pairs',
    'guard-for-in',
    'id-denylist',
    'id-match',
    'logical-assignment-operators',
    'max-nested-callbacks',
    'new-cap',
    'no-alert',
    'no-array-constructor',
    'no-async-promise-executor',
    'no-caller',
    'no-case-declarations',
    'no-class-assign',
    'no-compare-neg-zero',
    'no-cond-assign',
    'no-const-assign',
    'no-constant-binary-expression',
    'no-constant-condition',
    'no-constructor-return',
    'no-control-regex',
    'no-debugger',
    'no-delete-var',
    'no-div-regex',
    'no-dupe-args',
    'no-dupe-class-members',
    'no-dupe-else-if',
    'no-dupe-keys',
    'no-duplicate-case',
    'no-else-return',
    'no-empty',
    'no-empty-character-class',
    'no-empty-pattern',
    'no-empty-static-block',
    'no-eval',
    'no-ex-assign',
    'no-extend-native',
    'no-extra-bind',
    'no-extra-boolean-cast',
    'no-extra-label',
    'no-fallthrough',
    'no-func-assign',
    'no-global-assign',
    'no-implicit-globals',
    'no-implied-eval',
    'no-import-assign',
    'no-inner-declarations',
    'no-invalid-regexp',
    'no-invalid-this',
    'no-irregular-whitespace',
    'no-iterator',
    'no-label-var',
    'no-labels',
    'no-lone-blocks',
    'no-lonely-if',
    'no-loop-func',
    'no-loss-of-precision',
    'no-misleading-character-class',
    'no-multi-assign',
    'no-multi-str',
    'no-new',
    'no-new-func',
    'no-new-native-nonconstructor',
    'no-new-wrappers',
    'no-nonoctal-decimal-escape',
    'no-obj-calls',
    'no-object-constructor',
    'no-octal',
    'no-octal-escape',
    'no-param-reassign',
    'no-proto',
    'no-prototype-builtins',
    'no-redeclare',
    'no-regex-spaces',
    'no-return-assign',
    'no-script-url',
    'no-self-assign',
    'no-self-compare',
    'no-sequences',
    'no-setter-return',
    'no-shadow-restricted-names',
    'no-sparse-arrays',
    'no-template-curly-in-string',
    'no-this-before-super',
    'no-throw-literal',
    'no-unassigned-vars',
    'no-undef-init',
    'no-unneeded-ternary',
    'no-unreachable',
    'no-unreachable-loop',
    'no-unsafe-finally',
    'no-unsafe-negation',
    'no-unsafe-optional-chaining',
    'no-unused-expressions',
    'no-unused-labels',
    'no-unused-private-class-members',
    'no-useless-backreference',
    'no-useless-call',
    'no-useless-catch',
    'no-useless-computed-key',
    'no-useless-concat',
    'no-useless-constructor',
    'no-useless-escape',
    'no-useless-rename',
    'no-useless-return',
    'no-var',
    'no-warning-comments',
    'no-with',
    'operator-assignment',
    'prefer-const',
    'prefer-exponentiation-operator',
    'prefer-numeric-literals',
    'prefer-object-has-own',
    'prefer-object-spread',
    'prefer-promise-reject-errors',
    'prefer-regex-literals',
    'prefer-rest-params',
    'prefer-spread',
    'radix',
    'require-atomic-updates',
    'require-yield',
    'sort-vars',
    'strict',
    'symbol-description',
    'unicode-bom',
    'use-isnan',
    'valid-typeof',
    'vars-on-top',
    'yoda',
]);

const settledTypedRules = named('@typescript-eslint/', [
    'adjacent-overload-signatures',
    'await-thenable',
    'ban-ts-comment',
    'ban-tslint-comment',
    'class-literal-property-style',
    'consistent-indexed-object-style',
    'consistent-type-exports',
    'consistent-type-imports',
    'default-param-last',
    'no-array-constructor',
    'no-array-delete',
    'no-base-to-string',
    'no-confusing-non-null-assertion',
    'no-dupe-class-members',
    'no-duplicate-enum-values',
    'no-duplicate-type-constituents',
    'no-empty-object-type',
    'no-explicit-any',
    'no-extra-non-null-assertion',
    'no-extraneous-class',
    'no-floating-promises',
    'no-for-in-array',
    'no-generated-empty-object-type',
    'no-implied-eval',
    'no-inferrable-types',
    'no-invalid-this',
    'no-invalid-void-type',
    'no-misused-new',
    'no-misused-promises',
    'no-mixed-enums',
    'no-namespace',
    'no-non-null-asserted-nullish-coalescing',
    'no-non-null-asserted-optional-chain',
    'no-non-null-assertion',
    'no-redeclare',
    'no-redundant-type-constituents',
    'no-require-imports',
    'no-this-alias',
    'no-unnecessary-condition',
    'no-unnecessary-parameter-property-assignment',
    'no-unnecessary-qualifier',
    'no-unnecessary-type-arguments',
    'no-unnecessary-type-assertion',
    'no-unnecessary-type-constraint',
    'no-unnecessary-type-conversion',
    'no-unsafe-argument',
    'no-unsafe-assignment',
    'no-unsafe-call',
    'no-unsafe-declaration-merging',
    'no-unsafe-enum-assignment',
    'no-unsafe-enum-comparison',
    'no-unsafe-function-type',
    'no-unsafe-member-access',
    'no-unsafe-return',
    'no-unsafe-unary-minus',
    'no-unused-expressions',
    'no-unused-private-class-members',
    'no-useless-constructor',
    'no-useless-default-assignment',
    'no-useless-empty-export',
    'no-wrapper-object-types',
    'only-throw-error',
    'prefer-as-const',
    'prefer-enum-initializers',
    'prefer-find',
    'prefer-for-of',
    'prefer-function-type',
    'prefer-literal-enum-member',
    'prefer-namespace-keyword',
    'prefer-promise-reject-errors',
    'prefer-readonly',
    'prefer-reduce-type-parameter',
    'prefer-regexp-exec',
    'prefer-return-this-type',
    'prefer-string-starts-ends-with',
    'related-getter-setter-pairs',
    'require-await',
    'restrict-plus-operands',
    'restrict-template-expressions',
    'return-await',
    'switch-exhaustiveness-check',
    'triple-slash-reference',
    'unbound-method',
    'unified-signatures',
    'use-unknown-in-catch-callback-variable',
]);

const settledReactRules = named('', [
    'react/boolean-prop-naming',
    'react/button-has-type',
    'react/checked-requires-onchange-or-readonly',
    'react/default-props-match-prop-types',
    'react/display-name',
    'react/forbid-dom-props',
    'react/forbid-elements',
    'react/forbid-foreign-prop-types',
    'react/forbid-prop-types',
    'react/forward-ref-uses-ref',
    'react/iframe-missing-sandbox',
    'react/jsx-boolean-value',
    'react/jsx-key',
    'react/jsx-no-comment-textnodes',
    'react/jsx-no-duplicate-props',
    'react/jsx-no-script-url',
    'react/jsx-no-target-blank',
    'react/jsx-no-undef',
    'react/jsx-pascal-case',
    'react/jsx-fragments',
    'react/jsx-props-no-spread-multi',
    'react/jsx-uses-react',
    'react/jsx-uses-vars',
    'react/no-access-state-in-setstate',
    'react/no-adjacent-inline-elements',
    'react/no-arrow-function-lifecycle',
    'react/no-children-prop',
    'react/no-danger-with-children',
    'react/no-deprecated',
    'react/no-did-mount-set-state',
    'react/no-did-update-set-state',
    'react/no-direct-mutation-state',
    'react/no-find-dom-node',
    'react/no-is-mounted',
    'react/no-namespace',
    'react/no-set-state',
    'react/no-string-refs',
    'react/no-redundant-should-component-update',
    'react/no-render-return-value',
    'react/no-this-in-sfc',
    'react/no-typos',
    'react/no-unescaped-entities',
    'react/no-unsafe',
    'react/no-unused-class-component-methods',
    'react/no-unused-state',
    'react/no-will-update-set-state',
    'react/prefer-es6-class',
    'react/prefer-exact-props',
    'react/prefer-stateless-function',
    'react/require-optimization',
    'react/require-render-return',
    'react/self-closing-comp',
    'react/sort-comp',
    'react/sort-default-props',
    'react/sort-prop-types',
    'react/state-in-constructor',
    'react/static-property-placement',
    'react/style-prop-object',
    'react/void-dom-elements-no-children',
    'react-hooks/hooks',
    'react-hooks/capitalized-calls',
    'react-hooks/static-components',
    'react-hooks/use-memo',
    'react-hooks/void-use-memo',
    'react-hooks/preserve-manual-memoization',
    'react-hooks/memo-dependencies',
    'react-hooks/incompatible-library',
    'react-hooks/immutability',
    'react-hooks/globals',
    'react-hooks/refs',
    'react-hooks/memoized-effect-dependencies',
    'react-hooks/exhaustive-effect-dependencies',
    'react-hooks/set-state-in-effect',
    'react-hooks/error-boundaries',
    'react-hooks/purity',
    'react-hooks/set-state-in-render',
    'react-hooks/syntax',
    'react-hooks/unsupported-syntax',
    'react-hooks/config',
    'react-hooks/gating',
    'react-hooks/rule-suppression',
    'react-hooks/fbt',
    'jsx-a11y/alt-text',
    'jsx-a11y/anchor-ambiguous-text',
    'jsx-a11y/anchor-has-content',
    'jsx-a11y/anchor-is-valid',
    'jsx-a11y/aria-activedescendant-has-tabindex',
    'jsx-a11y/aria-props',
    'jsx-a11y/aria-proptypes',
    'jsx-a11y/aria-role',
    'jsx-a11y/aria-unsupported-elements',
    'jsx-a11y/autocomplete-valid',
    'jsx-a11y/click-events-have-key-events',
    'jsx-a11y/heading-has-content',
    'jsx-a11y/html-has-lang',
    'jsx-a11y/iframe-has-title',
    'jsx-a11y/img-redundant-alt',
    'jsx-a11y/interactive-supports-focus',
    'jsx-a11y/label-has-associated-control',
    'jsx-a11y/lang',
    'jsx-a11y/media-has-caption',
    'jsx-a11y/mouse-events-have-key-events',
    'jsx-a11y/no-access-key',
    'jsx-a11y/no-aria-hidden-on-focusable',
    'jsx-a11y/no-autofocus',
    'jsx-a11y/no-distracting-elements',
    'jsx-a11y/no-interactive-element-to-noninteractive-role',
    'jsx-a11y/no-noninteractive-element-to-interactive-role',
    'jsx-a11y/no-redundant-roles',
    'jsx-a11y/role-has-required-aria-props',
    'jsx-a11y/role-supports-aria-props',
    'jsx-a11y/scope',
    'jsx-a11y/tabindex-no-positive',
]);

const settledImportRules = named('import/', [
    'no-unresolved',
    'named',
    'default',
    'namespace',
    'export',
    'no-mutable-exports',
    'no-relative-packages',
    'no-self-import',
    'no-cycle',
    'no-named-default',
    'no-named-as-default',
    'no-named-as-default-member',
    'no-unused-modules',
    'no-commonjs',
    'no-amd',
    'first',
    'no-extraneous-dependencies',
    'no-absolute-path',
    'no-webpack-loader-syntax',
    'newline-after-import',
    'no-dynamic-require',
    'no-useless-path-segments',
    'no-import-module-exports',
    'no-empty-named-blocks',
]);

const settledTestRules = named('vitest/', [
    'consistent-each-for',
    'consistent-test-filename',
    'consistent-test-it',
    'consistent-vitest-vi',
    'expect-expect',
    'hoisted-apis-on-top',
    'max-nested-describe',
    'no-alias-methods',
    'no-commented-out-tests',
    'no-conditional-expect',
    'no-conditional-tests',
    'no-disabled-tests',
    'no-duplicate-hooks',
    'no-focused-tests',
    'no-identical-title',
    'no-import-node-test',
    'no-interpolation-in-snapshots',
    'no-large-snapshots',
    'no-mocks-import',
    'no-standalone-expect',
    'no-test-prefixes',
    'no-test-return-statement',
    'no-unneeded-async-expect-function',
    'padding-around-after-all-blocks',
    'padding-around-before-all-blocks',
    'prefer-called-exactly-once-with',
    'prefer-comparison-matcher',
    'prefer-each',
    'prefer-equality-matcher',
    'prefer-expect-type-of',
    'prefer-hooks-in-order',
    'prefer-hooks-on-top',
    'prefer-snapshot-hint',
    'prefer-to-be-object',
    'prefer-to-contain',
    'prefer-to-have-been-called-times',
    'prefer-todo',
    'prefer-vi-mocked',
    'require-awaited-expect-poll',
    'require-local-test-context-for-concurrent-snapshots',
    'unbound-method',
    'valid-describe-callback',
    'valid-expect-in-promise',
    'valid-expect',
    'valid-title',
    'warn-todo',
]);

// Layers, lowest first (docs/guards/frontend.md, "Layers"). A file imports from its own layer and the layers below it.
// render (components/render and lib/render) is the shared layer below features that the owner approved (D-16).
const LAYER_MESSAGE =
    'A layer imports only from the layers below it: types, lib, hooks, components/ui, components, render (lib/render and components/render), features/<domain>, layouts, pages (docs/guards/frontend.md, Layers).';
const layerGroups = (folders) => [
    {
        regex: `^@/(${folders.join('|')})(/|$)`,
        message: LAYER_MESSAGE,
    },
];
const layerTable = {
    [`${SOURCE}/types/**`]: [
        'lib',
        'hooks',
        'components',
        'features',
        'layouts',
        'pages',
        'data',
        'print',
        'testing',
    ],
    [`${SOURCE}/lib/**`]: [
        'lib/render',
        'hooks',
        'components',
        'features',
        'layouts',
        'pages',
    ],
    [`${SOURCE}/hooks/**`]: [
        'lib/render',
        'components',
        'features',
        'layouts',
        'pages',
    ],
    [`${SOURCE}/components/**`]: [
        'lib/render',
        'components/render',
        'features',
        'layouts',
        'pages',
    ],
    [`${SOURCE}/components/ui/**`]: [
        'lib/render',
        'hooks',
        'components(?!/ui(/|$))',
        'features',
        'layouts',
        'pages',
    ],
    // render is a layer of its own, after lib and components, so its block replaces theirs for its two folders.
    [`${SOURCE}/{lib,components}/render/**`]: ['features', 'layouts', 'pages'],
    [`${SOURCE}/features/**`]: ['layouts', 'pages'],
    [`${SOURCE}/layouts/**`]: ['pages'],
};

// One debounce: a second debounce package would be a second way.
const importPaths = [
    {
        name: 'use-debounce',
        message:
            'Debounce with the one debounce hook in hooks, not a package (docs/guards/frontend.md, One way per task).',
    },
];

// Each browser API has one door, so blocked storage, a missing matchMedia and a failed request behave the same
// everywhere. The file that is the door gets the same lists without its own entry (below).
const doors = {
    localStorage: 'lib/browser-storage',
    sessionStorage: 'lib/browser-storage',
    matchMedia:
        'lib/media-query (useMediaQuery in hooks/use-media-query for a component)',
    fetch: 'lib/http (or the typed doors lib/render/print-api.ts and features/edition/remote; lib/feature-count only counts); a page request is the Inertia HTTP hook',
    XMLHttpRequest: 'features/edition/remote',
};
const doorMessage = (door) =>
    `Use ${door}: it is the one place that touches this API (docs/guards/frontend.md, Doors).`;
const domEventMessage =
    'Listen to window and document through the one helper pair in lib/dom-events, which removes what it added (docs/guards/frontend.md, Doors).';
const consoleRule = {
    object: 'console',
    message:
        'Write to the console only through logWarning in lib/bugsnag; an error goes to reportError (docs/guards/frontend.md, Doors).',
};
const formatMessage =
    'Turn a number or date into text through lib/number-format or lib/datetime, which cache the formatter per locale (docs/guards/frontend.md, Doors).';
const doorGlobals = (except = []) => [
    ...Object.entries(doors)
        .filter(([name]) => !except.includes(name))
        .map(([name, door]) => ({ name, message: doorMessage(door) })),
    ...(except.includes('events')
        ? []
        : ['addEventListener', 'removeEventListener'].map((name) => ({
              name,
              message: domEventMessage,
          }))),
];
const doorProperties = (except = []) => [
    ...(except.includes('console') ? [] : [consoleRule]),
    ...(except.includes('events')
        ? []
        : ['addEventListener', 'removeEventListener'].flatMap((property) =>
              ['window', 'document', 'globalThis'].map((object) => ({
                  object,
                  property,
                  message: domEventMessage,
              })),
          )),
    ...Object.entries(doors)
        .filter(([name]) => !except.includes(name))
        .flatMap(([property, door]) =>
            ['window', 'globalThis'].map((object) => ({
                object,
                property,
                message: doorMessage(door),
            })),
        ),
    ...['NumberFormat', 'DateTimeFormat', 'RelativeTimeFormat']
        .filter((property) => !except.includes(property))
        .map((property) => ({
            object: 'Intl',
            property,
            message: formatMessage,
        })),
    ...['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'].map(
        (property) => ({ property, message: formatMessage }),
    ),
];
// Components and pages visit with router.visit; a list that filters through the URL has one hook that calls router.get.
const queryVisitRule = {
    object: 'router',
    property: 'get',
    message:
        'Visit with router.visit; a list that filters, searches or sorts through the URL uses the one query hook in hooks (docs/guards/frontend.md, One way per task).',
};
// A function a test captured from a mock is narrowed and called, so a wrong argument fails tsc.
const reflectApplyRule = {
    object: 'Reflect',
    property: 'apply',
    message:
        'Call the function directly: type the mock with vi.fn<Fn>() (docs/guards/frontend.md, Tests).',
};

// A component and a hook are const arrows with typed props. react/function-component-definition only sees a function
// that returns JSX, so a PascalCase declaration that builds JSX is caught here too.
const componentDeclarationRule = {
    selector:
        'FunctionDeclaration[id.name=/^[A-Z]/]:has(JSXElement, JSXFragment)',
    message:
        'A component is a const arrow with typed props: const X = ({ a }: XProps) => ... (docs/guards/frontend.md, One way per task).',
};
const hookDeclarationRule = {
    selector:
        ':matches(FunctionDeclaration, FunctionExpression)[id.name=/^use[A-Z]/]',
    message:
        'A hook is a const arrow: const useX = (...) => ... (docs/guards/frontend.md, One way per task).',
};
const reactNamespaceHookRule = {
    selector:
        'MemberExpression[object.name="React"][property.name=/^use[A-Z]/]',
    message:
        "Import a React hook by name (import { useState } from 'react') instead of reaching through React (docs/guards/frontend.md, One way per task).",
};
// A set of values the frontend owns is an `as const` object with a union type; a backend enum comes from the generated
// types. React 19 passes ref as a prop.
const sourceShapeRules = [
    {
        selector: 'TSEnumDeclaration',
        message:
            'No hand-written enum: a backend enum comes from @/types/generated; values the frontend owns are an `as const` object with a union type (docs/guards/frontend.md, One way per task).',
    },
    {
        selector:
            ':matches(CallExpression[callee.name="forwardRef"], CallExpression[callee.property.name="forwardRef"])',
        message:
            'Take ref as a prop (React 19): const X = ({ ref, ...props }: XProps) => ..., not forwardRef.',
    },
    {
        selector:
            ':matches(ExportAllDeclaration, ExportNamedDeclaration[source])',
        message:
            'No re-export: import the module that defines the name, so no file is a barrel (docs/guards/frontend.md, File names).',
    },
];
// A double assertion turns any type into any other; a typed fake (vi.fn<Fn>(), a partial with satisfies) keeps the check.
const doubleAssertionRule = {
    selector:
        'TSAsExpression > TSAsExpression.expression[typeAnnotation.type="TSUnknownKeyword"]',
    message:
        'No `as unknown as`: narrow the value, or build a typed fake (vi.fn<Fn>(), an object that satisfies the type) (docs/guards/frontend.md, Type escapes).',
};
const usePageGenericRule = {
    selector: 'CallExpression[callee.name="usePage"][typeArguments]',
    message:
        'Do not type usePage with a type argument: a page takes its own props as parameters, shared props are typed once (docs/guards/frontend.md, Page props).',
};
const useHttpNameRule = {
    selector: 'VariableDeclarator[id.name="http"][init.callee.name="useHttp"]',
    message:
        'Name a useHttp instance after what it does (save, previewRequest), not http (docs/guards/frontend.md, One way per task).',
};
// A poll that reloads a page prop is the poll hook of Inertia; a timer around a request is neither.
const pollRule = {
    selector:
        'CallExpression:matches([callee.name=/^set(Interval|Timeout)$/], [callee.property.name=/^set(Interval|Timeout)$/]) CallExpression:matches([callee.object.name="router"], [callee.name="fetch"])',
    message:
        'Poll a page prop with usePoll from @inertiajs/react and anything else with the one poller, never a timer around a request (docs/guards/frontend.md, One way per task).',
};
const fetchInEffectRule = {
    selector:
        'CallExpression[callee.name=/^use(Layout)?Effect$/] CallExpression[callee.name="fetch"]',
    message:
        'Read JSON for a component with the one query hook, not with a request inside an effect (docs/guards/frontend.md, One way per task).',
};
// A timer that is cleared and armed again in the same function is a hand-written debounce.
const timeoutCall = (name) =>
    `:matches([callee.name="${name}"], [callee.property.name="${name}"])`;
const ownStatement = (inner) =>
    `:statement:has(${inner}):not(:has(:function ${inner}))`;
const handWrittenDebounceRule = {
    selector: `${ownStatement(`CallExpression${timeoutCall('clearTimeout')}`)} ~ ${ownStatement(
        `AssignmentExpression > CallExpression.right${timeoutCall('setTimeout')}`,
    )}`,
    message:
        'Debounce with the one debounce hook, not by clearing and arming a timer yourself (docs/guards/frontend.md, One way per task).',
};
// A backend enum is generated into types/generated.ts as a union of string literals; a union that lists its values again
// drifts the day a case is added.
const generatedTypes = fs.readFileSync(
    path.resolve(import.meta.dirname, SOURCE, 'types/generated.ts'),
    'utf8',
);
const generatedUnionRules = [
    ...generatedTypes.matchAll(
        /^export type (\w+) = ('[^']+'(?: \| '[^']+')+);$/gm,
    ),
].map(([, name, union]) => ({
    selector: `TSUnionType[types.length>=2]:not(:has(> :not(TSLiteralType[literal.value=/^(${[
        ...union.matchAll(/'([^']+)'/g),
    ]
        .map(([, value]) => value)
        .join('|')})$/])))`,
    message: `Use the generated ${name} from @/types/generated instead of a union of its values (docs/guards/frontend.md, One way per task).`,
}));
// A focused, skipped, todo or expected-to-fail test hides what the suite covers; a snapshot pins markup nobody reads.
const focusedTestRules = [
    {
        selector:
            ':matches(MemberExpression[object.name=/^(it|test|describe|bench)$/][property.name=/^(only|skip|todo|skipIf|runIf|fails)$/], CallExpression[callee.name=/^(fit|xit|xtest|fdescribe|xdescribe)$/])',
        message:
            'No focused, skipped, todo or expected-to-fail test: every test runs and passes, or is deleted (docs/guards/frontend.md, Tests).',
    },
    {
        selector:
            'CallExpression[callee.property.name=/^(toMatch(Inline|File)?Snapshot|toThrowErrorMatching(Inline)?Snapshot)$/]',
        message:
            'No snapshot test: assert the role, name or text the behavior is about (docs/guards/frontend.md, Tests).',
    },
];
// @inertiajs/react has one shared fake in the test set-up; a mock of its own in a test file drifts from it.
const inertiaMockRule = {
    selector:
        'CallExpression[callee.object.name="vi"][callee.property.name=/^(mock|doMock)$/]:matches([arguments.0.value=/^@inertiajs\\u002F/], [arguments.0.source.value=/^@inertiajs\\u002F/])',
    message:
        'Use the shared fake of @inertiajs/react from the test set-up, not a vi.mock of your own (docs/guards/frontend.md, Tests).',
};
const useFormMockRule = {
    selector:
        'Property[key.name="useForm"]:not(:has(> CallExpression.value[callee.name="createUseForm"]))',
    message:
        'Fake useForm with the one form-hook factory, not a hand-built object (docs/guards/frontend.md, Tests).',
};
const sourceSyntaxRules = [
    componentDeclarationRule,
    hookDeclarationRule,
    reactNamespaceHookRule,
    ...sourceShapeRules,
    doubleAssertionRule,
    usePageGenericRule,
    useHttpNameRule,
    pollRule,
    fetchInEffectRule,
    handWrittenDebounceRule,
    ...generatedUnionRules,
    ...focusedTestRules,
];
const testSyntaxRules = [
    componentDeclarationRule,
    hookDeclarationRule,
    reactNamespaceHookRule,
    doubleAssertionRule,
    usePageGenericRule,
    pollRule,
    fetchInEffectRule,
    handWrittenDebounceRule,
    ...focusedTestRules,
    inertiaMockRule,
    useFormMockRule,
];

// Local rules for what a selector cannot say.
const fromSource = (context) =>
    path
        .relative(path.join(context.cwd, SOURCE), context.filename)
        .split(path.sep);

// File and folder names are kebab-case, and no file is an index barrel. A page keeps the name its controller renders
// (Inertia::render('editions/index')), so a page named index is no barrel.
const kebabCase = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const namesPlugin = {
    rules: {
        'kebab-case': {
            meta: {
                type: 'problem',
                schema: [],
                messages: {
                    name: 'Name files and folders in kebab-case (use-edition-status.ts, edition-card.tsx); `{{ name }}` is not (docs/guards/frontend.md, File names).',
                    barrel: 'No index barrel: import the module that defines the name, not the folder (docs/guards/frontend.md, File names).',
                },
            },
            create: (context) => ({
                Program: (node) => {
                    const parts = fromSource(context);
                    const file = parts.pop() ?? '';
                    const loc = { line: 1, column: 0 };
                    for (const folder of parts) {
                        if (!kebabCase.test(folder)) {
                            context.report({
                                node,
                                loc,
                                messageId: 'name',
                                data: { name: folder },
                            });
                        }
                    }
                    const [stem = '', ...rest] = file.split('.');
                    if (
                        stem === 'index' &&
                        parts[0] !== 'pages' &&
                        !file.endsWith('.d.ts')
                    ) {
                        context.report({ node, loc, messageId: 'barrel' });
                    }
                    if (file.endsWith('.d.ts')) {
                        return;
                    }
                    if (
                        ![stem, ...rest.slice(0, -1)].every((part) =>
                            kebabCase.test(part),
                        )
                    ) {
                        context.report({
                            node,
                            loc,
                            messageId: 'name',
                            data: { name: file },
                        });
                    }
                },
            }),
        },
    },
};

// The folders of the layer table; a file elsewhere fails. lib and components hold their own files and the render
// layer; a domain folder belongs in features/<domain>.
const finalFolder = (parts) => {
    const [top, second] = parts;
    if (parts.length === 1) {
        return ['app.tsx', 'ssr.tsx', 'print.tsx'].includes(top);
    }
    if (
        ['types', 'hooks', 'layouts', 'pages', 'features', 'testing'].includes(
            top,
        )
    ) {
        return top !== 'features' || parts.length > 2;
    }
    if (top === 'lib') {
        return parts.length === 2 || second === 'render';
    }
    if (top === 'components') {
        return parts.length === 2 || second === 'ui' || second === 'render';
    }

    return false;
};
// A feature never imports another feature, and a page never imports another page.
const ownUnit = (parts) =>
    parts[0] === 'features'
        ? parts.slice(0, 2).join('/')
        : parts[0] === 'pages'
          ? parts.join('/')
          : null;
const layersPlugin = {
    rules: {
        'final-folder': {
            meta: {
                type: 'problem',
                schema: [],
                messages: {
                    folder: 'This file is in no folder of the layer table: move it to types, lib, hooks, components/ui, components, components/render or lib/render, features/<domain>, layouts or pages (docs/guards/frontend.md, Layers).',
                },
            },
            create: (context) => ({
                Program: (node) => {
                    if (!finalFolder(fromSource(context))) {
                        context.report({
                            node,
                            loc: { line: 1, column: 0 },
                            messageId: 'folder',
                        });
                    }
                },
            }),
        },
        'no-sibling-import': {
            meta: {
                type: 'problem',
                schema: [],
                messages: {
                    sibling:
                        'A feature never imports another feature and a page never imports another page: move what both need one layer down (docs/guards/frontend.md, Layers).',
                },
            },
            create: (context) => {
                const parts = fromSource(context);
                const own = ownUnit(parts);
                const check = (node) => {
                    const source = node.source?.value;
                    if (own === null || typeof source !== 'string') {
                        return;
                    }
                    const target = source.startsWith('@/')
                        ? source.slice(2).split('/')
                        : source.startsWith('.')
                          ? path
                                .relative(
                                    path.join(context.cwd, SOURCE),
                                    path.resolve(
                                        path.dirname(context.filename),
                                        source,
                                    ),
                                )
                                .split(path.sep)
                          : null;
                    if (target === null || target[0] !== parts[0]) {
                        return;
                    }
                    const theirs = ownUnit(target);
                    if (
                        theirs !== null &&
                        !theirs.startsWith(own.replace(/\.tsx?$/, '')) &&
                        !own.startsWith(theirs)
                    ) {
                        context.report({ node, messageId: 'sibling' });
                    }
                };

                return {
                    ImportDeclaration: check,
                    ExportNamedDeclaration: check,
                    ExportAllDeclaration: check,
                };
            },
        },
    },
};

// A page takes its props as parameters (({ a, b }: Props) => ...). It names the whole object only to hand it on.
const pagesPlugin = {
    rules: {
        'destructure-props': {
            meta: {
                type: 'suggestion',
                schema: [],
                messages: {
                    destructure:
                        'Take the props of a page as parameters: ({ a, b }: Props) => ...; name the whole object only to hand it on (docs/guards/frontend.md, Page props).',
                },
            },
            create: (context) => {
                const check = (node) => {
                    const [parameter] = node.params;
                    if (parameter?.type !== 'Identifier') {
                        return;
                    }
                    const handedOn = context.sourceCode
                        .getDeclaredVariables(node)
                        .filter((variable) => variable.name === parameter.name)
                        .flatMap((variable) => variable.references)
                        .some(({ identifier }) => {
                            const { parent } = identifier;
                            const readsOneProp =
                                parent.type === 'MemberExpression' &&
                                parent.object === identifier &&
                                !parent.computed;
                            const destructures =
                                parent.type === 'VariableDeclarator' &&
                                parent.init === identifier &&
                                parent.id.type === 'ObjectPattern';

                            return !readsOneProp && !destructures;
                        });
                    if (!handedOn) {
                        context.report({
                            node: parameter,
                            messageId: 'destructure',
                        });
                    }
                };

                return {
                    'Program > VariableDeclaration > VariableDeclarator[id.name=/^[A-Z]/] > ArrowFunctionExpression':
                        check,
                    'Program > FunctionDeclaration[id.name=/^[A-Z]/]': check,
                    'Program > :matches(ExportNamedDeclaration, ExportDefaultDeclaration) > FunctionDeclaration[id.name=/^[A-Z]/]':
                        check,
                };
            },
        },
    },
};

// A success the server decided is a flash message the one central toast shows, never a second toast from the client.
const toastsPlugin = {
    rules: {
        'no-success-toast': {
            meta: {
                type: 'problem',
                schema: [],
                messages: {
                    success:
                        'Report a success with a server flash and the one central toast; a notice without a visit behind it is a toast without a success variant (docs/guards/frontend.md, One way per task).',
                },
            },
            create: (context) => {
                const report = (node) =>
                    context.report({ node, messageId: 'success' });

                return {
                    'CallExpression[callee.object.name="toast"][callee.property.name="success"]':
                        report,
                    'CallExpression[callee.name="toast"] > ObjectExpression Property[key.name="variant"] Literal[value="success"]':
                        report,
                };
            },
        },
    },
};

// A visit in progress is the processing state of the visit hook, not a useState that onStart or onFinish sets.
const visitsPlugin = {
    rules: {
        'no-visit-state': {
            meta: {
                type: 'problem',
                schema: [],
                messages: {
                    state: 'Show that a visit is running with the processing state of the visit hook, not a useState that onStart or onFinish sets (docs/guards/frontend.md, One way per task).',
                },
            },
            create: (context) => ({
                'Property[key.name=/^on(Start|Finish)$/] CallExpression[callee.name=/^set[A-Z]/][arguments.0.raw=/^(true|false)$/]':
                    (node) => context.report({ node, messageId: 'state' }),
            }),
        },
    },
};

// A file the user saves leaves through the one download helper, which builds the link and frees the object URL.
const downloadsPlugin = {
    rules: {
        'no-download-link': {
            meta: {
                type: 'problem',
                schema: [],
                messages: {
                    link: 'Hand a file to the user with the one download helper in lib, not a link built by hand (docs/guards/frontend.md, One way per task).',
                },
            },
            create: (context) => {
                const report = (node) =>
                    context.report({ node, messageId: 'link' });

                return {
                    'CallExpression[callee.object.name="document"][callee.property.name="createElement"][arguments.0.value="a"]':
                        report,
                    'AssignmentExpression > MemberExpression.left[property.name="download"]':
                        report,
                };
            },
        },
    },
};

// A write to location leaves the Inertia app: a visit is router.visit, a full page load goes through lib/full-page-navigation.
const locationObject =
    ':matches([object.name="location"], [object.property.name="location"])';
const navigationPlugin = {
    rules: {
        'no-location-write': {
            meta: {
                type: 'problem',
                schema: [],
                messages: {
                    write: 'Visit with router.visit; leave the app through lib/full-page-navigation (docs/guards/frontend.md, One way per task).',
                },
            },
            create: (context) => {
                // The door itself is the one file that leaves the app.
                if (
                    fromSource(context).join('/') ===
                    'lib/full-page-navigation.ts'
                ) {
                    return {};
                }
                const report = (node) =>
                    context.report({ node, messageId: 'write' });

                return {
                    [`AssignmentExpression > MemberExpression.left${locationObject}`]:
                        report,
                    'AssignmentExpression > MemberExpression.left[object.name=/^(window|globalThis|document)$/][property.name="location"]':
                        report,
                    [`CallExpression > MemberExpression.callee[property.name=/^(assign|replace|reload)$/]${locationObject}`]:
                        report,
                };
            },
        },
    },
};

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

// A file holds at most 400 lines, and a function at most 80 with blank lines and comments not counted
// (docs/guards/frontend.md, Size).
const MAX_FILE_LINES = 400;
const MAX_FUNCTION_LINES = 80;

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
        files: ['scripts/**/*.mjs', 'tools/**/*.mjs', 'eslint.config.js'],
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
