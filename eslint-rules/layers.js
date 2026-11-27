import path from 'node:path';

import { fromSource, SOURCE } from './source.js';

// Layers, lowest first (docs/guards/frontend.md, "Layers"). A file imports from its own layer and the layers below it.
// render (components/render and lib/render) is the shared layer below features that the owner approved (D-16).
const LAYER_MESSAGE =
    'A layer imports only from the layers below it: types, lib, hooks, components/ui, components, render (lib/render and components/render), features/<domain>, layouts, pages (docs/guards/frontend.md, Layers).';
export const layerGroups = (folders) => [
    {
        regex: `^@/(${folders.join('|')})(/|$)`,
        message: LAYER_MESSAGE,
    },
];
export const layerTable = {
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
export const importPaths = [
    {
        name: 'use-debounce',
        message:
            'Debounce with the one debounce hook in hooks, not a package (docs/guards/frontend.md, One way per task).',
    },
];

// The folders of the layer table; a file elsewhere fails. lib and components hold their own files and the render
// layer; a domain folder belongs in features/<domain>.
const finalFolder = (parts) => {
    const [top, second] = parts;
    if (parts.length === 1) {
        return ['app', 'ssr', 'print'].some(
            (entry) => top === `${entry}.tsx` || top === `${entry}.test.tsx`,
        );
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
export const layersPlugin = {
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
