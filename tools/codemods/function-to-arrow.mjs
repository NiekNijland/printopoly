// Turns every function declaration with a body into a const arrow (kit catalog/frontend-react.md, "Function declaration to
// const arrow"); func-style has no fixer and react/function-component-definition covers components only.
//   node tools/codemods/function-to-arrow.mjs <file|folder>... [--exclude <prefix>]...
// The header text comes from the node: async, type parameters, parameters and return type are kept as written, the body is
// moved as it is. `export default function X` becomes `const X` plus `export default X`. A single type parameter without a
// constraint gets a trailing comma in a .tsx file, so it is not read as JSX. A generator, or a function that reads `this` or
// `arguments`, becomes a function expression. An overloaded function and an assertion function are left alone and reported:
// an arrow cannot carry overloads, and an assertion needs a typed name. A declaration that code above it called at load time
// is a TS2448 error of the type check after the run; move that declaration up by hand.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';

import ts from 'typescript';

const args = process.argv.slice(2);
const excludes = args.flatMap((arg, index) =>
    args[index - 1] === '--exclude' ? [arg] : [],
);
const targets = args.filter(
    (arg, index) => arg !== '--exclude' && args[index - 1] !== '--exclude',
);
if (targets.length === 0) {
    console.error(
        'Usage: node tools/codemods/function-to-arrow.mjs <file|folder>... [--exclude <prefix>]...',
    );
    process.exit(64);
}

const files = targets
    .flatMap((target) =>
        statSync(target).isDirectory()
            ? execFileSync('git', ['ls-files', target], { encoding: 'utf8' })
                  .split('\n')
                  .filter((file) => /\.tsx?$/.test(file))
            : [target],
    )
    .filter((file) => !file.endsWith('.d.ts'))
    .filter((file) => !excludes.some((prefix) => file.startsWith(prefix)));

const readsOwnThis = (body) => {
    let found = false;
    const visit = (node) => {
        if (found) {
            return;
        }
        if (
            ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isClassLike(node) ||
            ts.isMethodDeclaration(node)
        ) {
            return;
        }
        if (
            node.kind === ts.SyntaxKind.ThisKeyword ||
            (ts.isIdentifier(node) && node.text === 'arguments')
        ) {
            found = true;

            return;
        }
        ts.forEachChild(node, visit);
    };
    ts.forEachChild(body, visit);

    return found;
};

const hasModifier = (node, kind) =>
    (node.modifiers ?? []).some((modifier) => modifier.kind === kind);

const skipped = [];
const convert = (file) => {
    const text = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const declarations = [];
    const visit = (node) => {
        if (ts.isFunctionDeclaration(node) && node.body !== undefined) {
            declarations.push(node);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);

    const overloaded = new Set(
        declarations
            .map((node) => node.parent)
            .flatMap((parent) =>
                (parent.statements ?? [])
                    .filter(
                        (statement) =>
                            ts.isFunctionDeclaration(statement) &&
                            statement.body === undefined &&
                            statement.name !== undefined,
                    )
                    .map((statement) => statement.name.text),
            ),
    );

    const edits = [];
    for (const node of declarations) {
        const name = node.name?.text;
        if (name === undefined) {
            skipped.push(`${file}: anonymous default export`);
            continue;
        }
        if (overloaded.has(name)) {
            skipped.push(`${file}: ${name} has overloads`);
            continue;
        }
        if (
            node.type !== undefined &&
            ts.isTypePredicateNode(node.type) &&
            node.type.assertsModifier !== undefined
        ) {
            skipped.push(`${file}: ${name} is an assertion function`);
            continue;
        }
        const exported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
        const isDefault = hasModifier(node, ts.SyntaxKind.DefaultKeyword);
        const isAsync = hasModifier(node, ts.SyntaxKind.AsyncKeyword);
        const asExpression =
            node.asteriskToken !== undefined || readsOwnThis(node.body);

        const open = text.indexOf(
            '(',
            node.typeParameters?.end ?? node.name.end,
        );
        let typeParameters = node.typeParameters
            ? text.slice(node.name.end, open).trim()
            : '';
        if (
            !asExpression &&
            file.endsWith('.tsx') &&
            node.typeParameters?.length === 1 &&
            node.typeParameters[0].constraint === undefined &&
            !typeParameters.replace(/\s/g, '').endsWith(',>')
        ) {
            typeParameters = typeParameters.replace(/>$/, ',>');
        }
        const signature = text.slice(open, node.body.getStart()).trimEnd();
        const body = text.slice(node.body.getStart(), node.body.end);
        const prefix = exported && !isDefault ? 'export ' : '';
        const value = asExpression
            ? `${isAsync ? 'async ' : ''}function${node.asteriskToken ? '*' : ''} ${typeParameters}${signature} ${body}`
            : `${isAsync ? 'async ' : ''}${typeParameters}${signature} => ${body}`;
        const replacement = `${prefix}const ${name} = ${value};${isDefault ? `\nexport default ${name};` : ''}`;
        edits.push({ start: node.getStart(), end: node.end, replacement });
    }

    // An inner declaration sits inside an outer one: this pass rewrites the outermost ones, the next pass the ones inside.
    const outermost = edits.filter(
        (edit) =>
            !edits.some(
                (other) =>
                    other !== edit &&
                    other.start <= edit.start &&
                    edit.end <= other.end,
            ),
    );
    let result = text;
    for (const edit of outermost.sort((a, b) => b.start - a.start)) {
        result =
            result.slice(0, edit.start) +
            edit.replacement +
            result.slice(edit.end);
    }
    if (outermost.length > 0) {
        writeFileSync(file, result);
    }

    return outermost.length;
};

let total = 0;
let pass = -1;
while (pass !== 0) {
    pass = files.reduce((sum, file) => sum + convert(file), 0);
    total += pass;
}
for (const line of new Set(skipped)) {
    console.log(`skipped ${line}`);
}
console.log(
    `converted ${total} function declarations in ${files.length} files`,
);
