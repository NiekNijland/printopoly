import { useEffect, useRef } from 'react';

import {
    actionForKey,
    isInteractiveTarget,
    isTypingTarget,
    type ShortcutAction,
} from '@/lib/editor/shortcuts';

export type ShortcutHandlers = Partial<{
    [Type in ShortcutAction['type']]: Type extends 'tab'
        ? (index: number) => void
        : () => void;
}>;

/** True while a modal dialog is open: the shortcuts of the page stay quiet behind it. */
function dialogOpen(): boolean {
    return (
        document.querySelector('[role="dialog"][data-state="open"]') !== null
    );
}

/**
 * One keydown listener for the editor's shortcuts (B73). It never fires while typing in a field
 * or while a dialog is open, and leaves a key alone that something else already handled.
 */
export function useEditorShortcuts(
    handlers: ShortcutHandlers,
    plain: boolean,
): void {
    const latest = useRef({ handlers, plain });
    useEffect(() => {
        latest.current = { handlers, plain };
    });

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.defaultPrevented || event.isComposing) {
                return;
            }
            const action = actionForKey(event, {
                plain: latest.current.plain,
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

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);
}
