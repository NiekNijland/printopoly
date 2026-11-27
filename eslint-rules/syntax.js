import fs from 'node:fs';
import path from 'node:path';

import { SOURCE } from './source.js';

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
const generatedTypes = fs.readFileSync(
    path.resolve(import.meta.dirname, '..', SOURCE, 'types/generated.ts'),
    'utf8',
);
export const generatedUnionRules = [
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
const realTimeWaitRule = {
    selector:
        'NewExpression[callee.name="Promise"] CallExpression:matches([callee.name="setTimeout"], [callee.property.name="setTimeout"])[arguments.length>=2]:not([arguments.1.value=0])',
    message:
        'No real-time wait in a test: wait for what you expect with waitFor, or move time with vi.useFakeTimers (docs/guards/frontend.md, Tests).',
};
const clockReadRule = {
    selector:
        ':matches(NewExpression[callee.name="Date"][arguments.length=0], CallExpression[callee.name="Date"])',
    message:
        'Read the time through now in lib/clock and build the date from it: new Date(now()) (docs/guards/frontend.md, Doors).',
};
export const sourceSyntaxRules = [
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
    clockReadRule,
    ...generatedUnionRules,
    ...focusedTestRules,
];
export const testSyntaxRules = [
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
    realTimeWaitRule,
];
export const testingSyntaxRules = [...sourceSyntaxRules, realTimeWaitRule];
