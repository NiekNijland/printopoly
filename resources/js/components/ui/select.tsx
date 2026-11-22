import type { ComponentProps } from 'react';

import { NativeSelect } from './native-select';

/**
 * Adapter for the callers from before shadcn's NativeSelect (B86, B195): `className` sizes the box, as it did.
 * New code uses `NativeSelect` directly.
 */
function Select({ className, ...props }: ComponentProps<'select'>) {
    return <NativeSelect wrapperClassName={className} {...props} />;
}

export { Select };
