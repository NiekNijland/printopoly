import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

interface Disclosure {
    open: boolean;
    toggle: () => void;
    close: () => void;
}

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

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', onPointerDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [open, containerRef]);

    return { open, toggle, close };
};
