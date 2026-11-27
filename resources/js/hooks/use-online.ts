import { useSyncExternalStore } from 'react';

import { listenToWindow } from '@/lib/dom-events';

const subscribe = (onChange: () => void): (() => void) => {
    const stopOnline = listenToWindow('online', onChange);
    const stopOffline = listenToWindow('offline', onChange);

    return () => {
        stopOnline();
        stopOffline();
    };
};

/** Whether the browser has a connection, as it says itself; true on the server. */
export const useOnline = (): boolean => {
    return useSyncExternalStore(
        subscribe,
        () => navigator.onLine,
        () => true,
    );
};
