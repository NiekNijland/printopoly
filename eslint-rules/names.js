import { fromSource } from './source.js';

// File and folder names are kebab-case, and no file is an index barrel. A page keeps the name its controller renders
// (Inertia::render('editions/index')), so a page named index is no barrel.
const kebabCase = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const namesPlugin = {
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
