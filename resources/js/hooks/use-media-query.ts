import { useCallback, useSyncExternalStore } from 'react';

/** Whether a media query matches now, following changes. `fallback` is used where there is no `matchMedia`. */
function useMediaQuery(query: string, fallback = false): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (typeof window === 'undefined' || !('matchMedia' in window)) {
                return () => undefined;
            }
            const list = window.matchMedia(query);
            list.addEventListener('change', onChange);

            return () => list.removeEventListener('change', onChange);
        },
        [query],
    );

    return useSyncExternalStore(
        subscribe,
        () =>
            typeof window === 'undefined' || !('matchMedia' in window)
                ? fallback
                : window.matchMedia(query).matches,
        () => fallback,
    );
}

/**
 * The editor shows the list and the panel side by side from here (Tailwind `md`, B155): a tablet gets two columns,
 * a desktop three. Below it the phone layout folds the panel sections.
 */
export function useWideScreen(): boolean {
    return useMediaQuery('(min-width: 768px)', true);
}

/**
 * Whether the person has a keyboard and a mouse, so keyboard hints ("druk op W") make sense. A phone or a
 * tablet without a mouse gets none (bug 10 of the integratie-evaluatie).
 */
export function useKeyboardHints(): boolean {
    return !useMediaQuery('(hover: none), (pointer: coarse)', false);
}
