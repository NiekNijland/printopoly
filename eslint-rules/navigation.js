import path from 'node:path';

import { doorFiles } from './doors.js';
import { fromSource } from './source.js';

// A write to location leaves the Inertia app: a visit is router.visit, a full page load goes through lib/full-page-navigation.
const locationObject =
    ':matches([object.name="location"], [object.property.name="location"])';
export const navigationPlugin = {
    rules: {
        'no-location-write': {
            meta: {
                type: 'problem',
                schema: [],
                messages: {
                    write: 'Visit with router.visit; leave the app through lib/full-page-navigation (docs/guards/frontend.md, One way per task).',
                },
            },
            create: (context) => {
                const file = fromSource(context).join('/');
                if (
                    Object.entries(doorFiles).some(
                        ([door, apis]) =>
                            apis.includes('location') &&
                            path.matchesGlob(file, door),
                    )
                ) {
                    return {};
                }
                const report = (node) =>
                    context.report({ node, messageId: 'write' });

                return {
                    [`AssignmentExpression > MemberExpression.left${locationObject}`]:
                        report,
                    'AssignmentExpression > MemberExpression.left[object.name=/^(window|globalThis|document)$/][property.name="location"]':
                        report,
                    [`CallExpression > MemberExpression.callee[property.name=/^(assign|replace|reload)$/]${locationObject}`]:
                        report,
                };
            },
        },
    },
};
