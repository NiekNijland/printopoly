import type { Scheduler } from './session';

class BrowserTimer {
    constructor(readonly cancel: () => void) {}
}

export const browserScheduler: Scheduler = {
    setTimeout: (callback, ms) => {
        const handle = globalThis.setTimeout(callback, ms);

        return new BrowserTimer(() => globalThis.clearTimeout(handle));
    },
    clearTimeout: (handle) => {
        if (handle instanceof BrowserTimer) {
            handle.cancel();
        }
    },
};
