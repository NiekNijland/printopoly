import { useSyncExternalStore } from 'react';

import { canShareFiles } from '@/features/print/share-set-button';

const noChange = (): (() => void) => () => undefined;

/** Whether this browser can hand files to another app; false on the server and in the first paint of hydration. */
export const useCanShareFiles = (): boolean => {
    return useSyncExternalStore(noChange, canShareFiles, () => false);
};
