// A page takes its props as parameters (({ a, b }: Props) => ...). It names the whole object only to hand it on.
export const pagesPlugin = {
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
