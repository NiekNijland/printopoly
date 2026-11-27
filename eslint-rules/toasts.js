// A success the server decided is a flash message the one central toast shows, never a second toast from the client.
export const toastsPlugin = {
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
