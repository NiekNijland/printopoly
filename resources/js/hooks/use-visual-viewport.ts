import { useEffect, useState } from 'react';

import { listenToDocument } from '@/lib/dom-events';
import { mediaMatches } from '@/lib/media-query';

type VisualViewportState = {
    /** The height that is really visible, so without the on-screen keyboard. */
    height: number | null;
    /** True while an on-screen keyboard covers a large part of the window. */
    keyboardOpen: boolean;
};

const KEYBOARD_MIN = 140;

/**
 * Follows `visualViewport`. On a phone the on-screen keyboard shrinks the
 * visual viewport but not `100dvh`, so a full-height shell would end up behind
 * the keyboard and the focused field with it.
 */
export const useVisualViewport = (): VisualViewportState => {
    const [state, setState] = useState<VisualViewportState>({
        height: null,
        keyboardOpen: false,
    });

    useEffect(() => {
        const viewport = window.visualViewport;

        if (!viewport) {
            return;
        }

        const touch = (): boolean => mediaMatches('(pointer: coarse)');
        const update = (): void => {
            const covered = window.innerHeight - viewport.height;
            const open = touch() && covered > KEYBOARD_MIN;

            setState((previous) => {
                const next = {
                    height: open ? Math.round(viewport.height) : null,
                    keyboardOpen: open,
                };

                return previous.height === next.height &&
                    previous.keyboardOpen === next.keyboardOpen
                    ? previous
                    : next;
            });

            if (open && viewport.offsetTop > 0) {
                // iOS scrolls the page up to show the field; the shell fits already.
                window.scrollTo(0, 0);
            }
        };

        // Bring a focused field into view once the keyboard has slid up.
        const reveal = (event: FocusEvent): void => {
            const target = event.target;

            if (
                touch() &&
                target instanceof HTMLElement &&
                target.matches(
                    'input:not([type=checkbox],[type=radio],[type=file],[type=range]),textarea,select,[contenteditable=true]',
                )
            ) {
                window.setTimeout(() => {
                    target.scrollIntoView({
                        block: 'center',
                        behavior: 'smooth',
                    });
                }, 300);
            }
        };

        const stopReveal = listenToDocument('focusin', reveal);
        viewport.addEventListener('resize', update);
        viewport.addEventListener('scroll', update);
        update();

        return () => {
            stopReveal();
            viewport.removeEventListener('resize', update);
            viewport.removeEventListener('scroll', update);
        };
    }, []);

    return state;
};
