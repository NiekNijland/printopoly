import { useSyncExternalStore } from 'react';

const subscribeNever = (): (() => void) => () => undefined;

/** A value only the browser knows: the server render and the hydration see `serverValue`, the browser then reads it. */
export const useBrowserValue = <T>(read: () => T, serverValue: T): T =>
    useSyncExternalStore(subscribeNever, read, () => serverValue);
