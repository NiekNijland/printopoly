export const downloadsPlugin = {
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
