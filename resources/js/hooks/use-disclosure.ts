import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

import { listenToDocument } from '@/lib/dom-events';

type Disclosure = {
    open: boolean;
    toggle: () => void;
    close: () => void;
};

/**
 * Open and close a menu or panel. It closes on Escape and on a click outside
 * the container that holds the trigger and the panel.
 */
export const useDisclosure = (
    containerRef: RefObject<HTMLElement | null>,
): Disclosure => {
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => setOpen((value) => !value), []);
    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        const onPointerDown = (event: PointerEvent): void => {
            if (
                event.target instanceof Node &&
                !containerRef.current?.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        const stopKeyDown = listenToDocument('keydown', onKeyDown);
        const stopPointerDown = listenToDocument('pointerdown', onPointerDown);

        return () => {
            stopKeyDown();
            stopPointerDown();
        };
    }, [open, containerRef]);

    return { open, toggle, close };
};
