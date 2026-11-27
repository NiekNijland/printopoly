export const visitsPlugin = {
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
