import { fireEvent, renderHook } from '@testing-library/react';

import {
    useEditorShortcuts,
    type ShortcutHandlers,
} from './use-editor-shortcuts';

const press = (
    key: string,
    options: Partial<KeyboardEventInit> = {},
    target: Element = document.body,
): boolean => fireEvent.keyDown(target, { key, ...options });

const mount = (handlers: ShortcutHandlers, plain = true) =>
    renderHook(({ current, on }) => useEditorShortcuts(current, on), {
        initialProps: { current: handlers, on: plain },
    });

const strand = (): void => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    button.remove();
};

describe('useEditorShortcuts', () => {
    it('runs the handler of a plain letter and keeps the key for itself', () => {
        const next = vi.fn<() => void>();
        mount({ next });

        expect(press('j')).toBe(false);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('gives a tab number to the tab handler', () => {
        const tab = vi.fn<(index: number) => void>();
        mount({ tab });

        press('3');
        press('5', { altKey: true, code: 'Digit5' });

        expect(tab.mock.calls).toEqual([[2], [4]]);
    });

    it('leaves a key alone that has no handler', () => {
        mount({ next: vi.fn<() => void>() });

        expect(press('3')).toBe(true);
        expect(press('c')).toBe(true);
    });

    it('ignores plain letters when they are switched off, but not Ctrl+S', () => {
        const next = vi.fn<() => void>();
        const save = vi.fn<() => void>();
        mount({ next, save }, false);

        press('j');
        press('s', { ctrlKey: true });

        expect(next).not.toHaveBeenCalled();
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('uses the newest handlers after a render', () => {
        const first = vi.fn<() => void>();
        const second = vi.fn<() => void>();
        const { rerender } = mount({ next: first });

        rerender({ current: { next: second }, on: true });
        press('j');

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('stays quiet while typing, behind an open dialog and for a key already handled', () => {
        const next = vi.fn<() => void>();
        mount({ next });
        const input = document.createElement('input');
        document.body.append(input);

        press('j', {}, input);
        const handled = new KeyboardEvent('keydown', {
            key: 'j',
            bubbles: true,
            cancelable: true,
        });
        handled.preventDefault();
        document.body.dispatchEvent(handled);
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('data-state', 'open');
        document.body.append(dialog);
        press('j');

        dialog.remove();
        input.remove();
        expect(next).not.toHaveBeenCalled();
    });

    it('waits with letters after something closed, until a click on the page', () => {
        const next = vi.fn<() => void>();
        mount({ next });
        strand();

        press('j');
        expect(next).not.toHaveBeenCalled();

        const menu = document.createElement('div');
        menu.setAttribute('role', 'menu');
        document.body.append(menu);
        fireEvent.pointerDown(menu);
        press('j');
        expect(next).not.toHaveBeenCalled();

        fireEvent.pointerDown(document.body);
        press('j');
        menu.remove();
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('waits after a click that is gone, and lets letters work again after Esc out of a field', () => {
        const next = vi.fn<() => void>();
        mount({ next });
        strand();
        const gone = document.createElement('span');
        document.body.append(gone);
        fireEvent.pointerDown(gone);
        gone.remove();

        press('j');
        expect(next).not.toHaveBeenCalled();

        const input = document.createElement('input');
        document.body.append(input);
        input.focus();
        press('Escape', {}, input);
        input.remove();
        press('j');

        expect(next).toHaveBeenCalledTimes(1);
    });

    it('stops listening when it unmounts', () => {
        const next = vi.fn<() => void>();
        const { unmount } = mount({ next });

        unmount();
        press('j');

        expect(next).not.toHaveBeenCalled();
    });
});
