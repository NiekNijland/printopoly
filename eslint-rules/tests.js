const runnerOf = (callee) => {
    if (callee.type === 'Identifier') {
        return callee.name;
    }
    if (callee.type === 'MemberExpression') {
        return runnerOf(callee.object);
    }

    return callee.type === 'CallExpression' ? runnerOf(callee.callee) : null;
};

const commentLinesOf = (sourceCode) => {
    const lines = new Set();
    for (const comment of sourceCode.getAllComments()) {
        const { start, end } = comment.loc;
        for (let line = start.line; line <= end.line; line++) {
            const text = sourceCode.lines[line - 1] ?? '';
            const before =
                line === start.line ? text.slice(0, start.column) : '';
            const after = line === end.line ? text.slice(end.column) : '';
            if (`${before}${after}`.trim() === '') {
                lines.add(line);
            }
        }
    }

    return lines;
};

export const testsPlugin = {
    rules: {
        'max-test-lines': {
            meta: {
                type: 'suggestion',
                schema: [
                    {
                        type: 'object',
                        properties: { max: { type: 'integer', minimum: 1 } },
                        required: ['max'],
                        additionalProperties: false,
                    },
                ],
                messages: {
                    long: 'A test holds at most {{ max }} lines, blank lines and comments not counted; this one has {{ lines }}: split it by behaviour (docs/guards/frontend.md, Size).',
                },
            },
            create: (context) => {
                const [{ max }] = context.options;
                const { sourceCode } = context;
                const commentLines = commentLinesOf(sourceCode);

                return {
                    CallExpression: (node) => {
                        if (!['it', 'test'].includes(runnerOf(node.callee))) {
                            return;
                        }
                        const body = node.arguments.find(
                            ({ type }) =>
                                type === 'ArrowFunctionExpression' ||
                                type === 'FunctionExpression',
                        );
                        if (body === undefined) {
                            return;
                        }
                        let lines = 0;
                        for (
                            let line = body.loc.start.line;
                            line <= body.loc.end.line;
                            line++
                        ) {
                            if (
                                (sourceCode.lines[line - 1] ?? '').trim() !==
                                    '' &&
                                !commentLines.has(line)
                            ) {
                                lines++;
                            }
                        }
                        if (lines > max) {
                            context.report({
                                node: body,
                                messageId: 'long',
                                data: { max, lines },
                            });
                        }
                    },
                };
            },
        },
    },
};
