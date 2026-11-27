import { fromSource } from './source.js';

const PARSER = 'lib/parse.ts';

// The written type predicates that stay, each with its file. The ratchet row lint-type-predicates counts them.
export const predicateDoors = {
    isServerElements: 'features/print/print-payload.ts',
};

const nameOf = (fn) => {
    if (fn.id) {
        return fn.id.name;
    }
    if (fn.parent?.type === 'VariableDeclarator') {
        return fn.parent.id.name;
    }

    return fn.parent?.key?.name ?? null;
};

export const predicatesPlugin = {
    rules: {
        'no-type-predicate': {
            meta: {
                type: 'problem',
                schema: [],
                messages: {
                    predicate:
                        'Read a value of unknown shape with a parser from lib/parse (is, parseOrUndefined, validItems), or let the compiler infer the predicate of a check that narrows by itself; a written `x is T` can promise more than it checks (docs/decisions/0011-typepredicaten.md).',
                },
            },
            create: (context) => {
                const file = fromSource(context).join('/');
                if (file === PARSER) {
                    return {};
                }

                return {
                    TSTypePredicate: (node) => {
                        if (node.typeAnnotation === null) {
                            return;
                        }
                        const name = nameOf(node.parent.parent);
                        if (
                            name !== null &&
                            Object.hasOwn(predicateDoors, name) &&
                            predicateDoors[name] === file
                        ) {
                            return;
                        }
                        context.report({ node, messageId: 'predicate' });
                    },
                };
            },
        },
    },
};
