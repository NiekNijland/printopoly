import { useEffect, useRef } from 'react';

import { listenToWindow } from '@/lib/dom-events';

/**
 * The back button of the phone (or the browser) closes what lies open on top first: an element screen, the big
 * board, a dialog. Gerda pressed back with a space open and landed on the home page (R5-14).
 *
 * Each open layer adds one history entry with the same address and the same Inertia page, marked with its depth.
 * Back to an entry below it closes the layer, and Inertia never hears of it: the page stays as it is. A layer
 * closed by its own button takes its entry away again.
 */

const MARK = 'printopolyLayer';

type Layer = {
    close: () => void;
};

const layers: Layer[] = [];
/** History steps that the code took itself, to take away the entry of a layer closed by its own button. */
let ownSteps = 0;
let listening = false;
/** The step back for a layer that just closed, a moment later: React may mount it again right away (StrictMode). */
let pendingBack: number | undefined;

const depthOf = (state: unknown): number => {
    if (typeof state !== 'object' || state === null || !(MARK in state)) {
        return -1;
    }
    const depth = (state as Record<string, unknown>)[MARK];

    return typeof depth === 'number' ? depth : -1;
};

const onPopState = (event: PopStateEvent): void => {
    if (ownSteps > 0) {
        ownSteps -= 1;
        event.stopImmediatePropagation();

        return;
    }
    const depth = depthOf(event.state);
    if (layers.length - 1 <= depth) {
        return;
    }
    // Ours: close every layer above the entry we came back to. The page itself stays; Inertia must not reload it.
    event.stopImmediatePropagation();
    while (layers.length - 1 > depth) {
        layers.pop()?.close();
    }
};

/**
 * Starts listening for the back button. The app calls it before Inertia boots, so this listener comes before the
 * one of Inertia on the window: Chrome calls the listeners of the window in the order they were added, capture or
 * not, and a later one could not keep Inertia from rendering the page again (which put the editor back on the tab
 * Bord after closing a card or a pawn, R6 Aisha and Sara).
 */
export const listenForBackLayers = (): void => {
    if (!listening && typeof window !== 'undefined') {
        // Capture, so it runs before the listener of Inertia on the same window.
        listenToWindow('popstate', onPopState, { capture: true });
        // Inertia writes the scroll position into the entry without an address; the mark of a layer stays on it.
        const replace = window.history.replaceState.bind(window.history);
        window.history.replaceState = (
            data: unknown,
            unused: string,
            url?: string | URL | null,
        ): void => {
            const depth = depthOf(window.history.state);
            replace(
                depth >= 0 &&
                    (url === undefined || url === null) &&
                    typeof data === 'object' &&
                    data !== null &&
                    !(MARK in data)
                    ? { ...data, [MARK]: depth }
                    : data,
                unused,
                url,
            );
        };
        listening = true;
    }
};

/** While `open`, the back button calls `close` instead of leaving the page. */
export const useBackCloses = (open: boolean, close: () => void): void => {
    const latest = useRef(close);
    useEffect(() => {
        latest.current = close;
    });

    useEffect(() => {
        if (!open || typeof window === 'undefined') {
            return;
        }
        listenForBackLayers();
        const layer: Layer = { close: () => latest.current() };
        layers.push(layer);
        const depth = layers.length - 1;
        const state: unknown = window.history.state;
        if (pendingBack !== undefined && depthOf(state) === depth) {
            // Closed and opened again at once: its entry is still there.
            window.clearTimeout(pendingBack);
            pendingBack = undefined;
        } else {
            window.history.pushState(
                {
                    ...(typeof state === 'object' && state !== null
                        ? state
                        : {}),
                    [MARK]: depth,
                },
                '',
                window.location.href,
            );
        }

        return () => {
            const at = layers.indexOf(layer);
            if (at === -1) {
                // Closed by the back button: its entry is gone already.
                return;
            }
            layers.splice(at, 1);
            if (depthOf(window.history.state) !== at) {
                return;
            }
            // Closed by its own button: take its entry away, so back does not have to be pressed twice.
            window.clearTimeout(pendingBack);
            pendingBack = window.setTimeout(() => {
                pendingBack = undefined;
                if (
                    layers.length <= at &&
                    depthOf(window.history.state) === at
                ) {
                    ownSteps += 1;
                    window.history.back();
                }
            }, 0);
        };
    }, [open]);
};
