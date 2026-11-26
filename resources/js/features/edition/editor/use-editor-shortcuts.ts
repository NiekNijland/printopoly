import { useEffect, useRef } from 'react';

import {
    actionForKey,
    isInteractiveTarget,
    isTypingTarget,
    leaveField,
    type ShortcutAction,
} from '@/features/edition/editor/shortcuts';

export type ShortcutHandlers = Partial<{
    [Type in ShortcutAction['type']]: Type extends 'tab'
        ? (index: number) => void
        : () => void;
}>;

/** True while a modal dialog is open: the shortcuts of the page stay quiet behind it. */
const dialogOpen = (): boolean => {
    return (
        document.querySelector('[role="dialog"][data-state="open"]') !== null
    );
};

/** Where a click landed in something that closes itself: a dialog, a menu or a popover. */
const CLOSING =
    '[role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]';

/**
 * One keydown listener for the editor's shortcuts (B73). It never fires while typing in a field
 * or while a dialog is open, and leaves a key alone that something else already handled.
 *
 * The single letters also wait when the focus fell back to the page after something closed (a dialog, a menu,
 * Controle, a screen on the phone): a letter typed then was meant for what just closed (UX 8, B179). They work
 * again after a click on the page, Tab to a control, or Esc out of a field. On a page that has had no focus yet
 * they work as before.
 */
export const useEditorShortcuts = (
    handlers: ShortcutHandlers,
    plain: boolean,
): void => {
    const latest = useRef({ handlers, plain });
    useEffect(() => {
        latest.current = { handlers, plain };
    });

    useEffect(() => {
        // Whether something had the focus, the last place a click landed since, and an Esc out of a field.
        const guard: {
            focused: boolean;
            pointer: Element | null;
            left: boolean;
        } = { focused: false, pointer: null, left: false };
        const onFocusIn = (event: FocusEvent): void => {
            if (event.target !== document.body) {
                guard.focused = true;
                guard.pointer = null;
                guard.left = false;
            }
        };
        const onPointerDown = (event: PointerEvent): void => {
            guard.pointer =
                event.target instanceof Element ? event.target : null;
        };
        /** The focus is on the page because something closed, not because you clicked there or left a field. */
        const stranded = (): boolean => {
            const active = document.activeElement;
            if (active !== null && active !== document.body) {
                return false;
            }
            if (!guard.focused || guard.left) {
                return false;
            }
            const click = guard.pointer;

            return (
                click === null ||
                !click.isConnected ||
                click.closest(CLOSING) !== null
            );
        };

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.defaultPrevented || event.isComposing) {
                return;
            }
            if (!dialogOpen() && leaveField(event)) {
                guard.left = true;

                return;
            }
            const action = actionForKey(event, {
                plain: latest.current.plain && !stranded(),
                typing: isTypingTarget(event.target),
                interactive: isInteractiveTarget(event.target),
            });
            if (action === null || dialogOpen()) {
                return;
            }
            const { handlers: current } = latest.current;
            if (action.type === 'tab') {
                if (current.tab !== undefined) {
                    event.preventDefault();
                    current.tab(action.index);
                }
            } else if (current[action.type] !== undefined) {
                event.preventDefault();
                current[action.type]?.();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('pointerdown', onPointerDown, true);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, []);
};
