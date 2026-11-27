import { reportError } from '@/lib/bugsnag';

/** What `saveOnPageHide` needs of a session: only the save that does not wait for the pause. */
type Flushable = {
    flush(): Promise<void>;
};

/**
 * Saves a pending change at once when the page goes away or out of sight (bug 3, ronde 3). The session waits
 * a short pause before it saves; a tab that is closed, reloaded or put in the background within that pause
 * lost the last change. `pagehide` covers closing and reloading, `visibilitychange` to hidden covers a phone
 * that switches apps (where `pagehide` often never comes). Returns a function that stops listening.
 */
export const saveOnPageHide = (
    session: Flushable,
    target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
    page: Pick<
        Document,
        'addEventListener' | 'removeEventListener' | 'visibilityState'
    > = document,
): (() => void) => {
    const save = (): void => {
        void session.flush().catch(reportError);
    };
    const onVisibility = (): void => {
        if (page.visibilityState === 'hidden') {
            save();
        }
    };

    target.addEventListener('pagehide', save);
    page.addEventListener('visibilitychange', onVisibility);

    return () => {
        target.removeEventListener('pagehide', save);
        page.removeEventListener('visibilitychange', onVisibility);
    };
};
