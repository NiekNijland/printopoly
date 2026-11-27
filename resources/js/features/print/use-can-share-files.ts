import { canShareFiles } from '@/features/print/share-set-button';
import { useBrowserValue } from '@/hooks/use-browser-value';

/** Whether this browser can hand files to another app; false on the server and in the first paint of hydration. */
export const useCanShareFiles = (): boolean =>
    useBrowserValue(canShareFiles, false);
