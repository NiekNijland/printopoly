import { afterEach, describe, expect, it, vi } from 'vitest';

const fresh = async () => {
    vi.resetModules();

    return import('./focus-return');
};

const button = (label: string, parent: HTMLElement = document.body) => {
    const element = document.createElement('button');
    element.textContent = label;
    parent.append(element);

    return element;
};

const menuWithTrigger = (id: string) => {
    const trigger = button('Menu');
    trigger.setAttribute('aria-controls', id);
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.id = id;
    document.body.append(menu);
    const item = button('Rename', menu);

    return { trigger, menu, item };
};

afterEach(() => {
    document.body.replaceChildren();
});

describe('currentOpener', () => {
    it('is the focused control', async () => {
        const { currentOpener } = await fresh();
        const save = button('Save');
        save.focus();

        expect(currentOpener()).toBe(save);
    });

    it('is the menu button when a menu item has the focus', async () => {
        const { currentOpener } = await fresh();
        const { trigger, item } = menuWithTrigger('menu-1');
        item.focus();

        expect(currentOpener()).toBe(trigger);
    });

    it('is the item itself when its menu has no id or no button', async () => {
        const { currentOpener } = await fresh();
        const menu = document.createElement('div');
        menu.setAttribute('role', 'menu');
        document.body.append(menu);
        const item = button('Copy', menu);
        item.focus();

        expect(currentOpener()).toBe(item);

        menu.id = 'menu-without-button';
        expect(currentOpener()).toBe(item);
    });

    it('is nothing when only the body had the focus and nothing was tracked', async () => {
        const { currentOpener } = await fresh();

        expect(currentOpener()).toBeNull();
    });

    it('falls back to the last tracked control once the focus is in a dialog', async () => {
        const { currentOpener, trackFocus } = await fresh();
        trackFocus();
        const { trigger, item } = menuWithTrigger('menu-3');
        item.focus();
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        document.body.append(dialog);
        item.remove();
        button('Close', dialog).focus();

        expect(currentOpener()).toBe(trigger);
    });

    it('ignores focus inside an alert dialog while tracking', async () => {
        const { currentOpener, trackFocus } = await fresh();
        trackFocus();
        const save = button('Save');
        save.focus();
        const alert = document.createElement('div');
        alert.setAttribute('role', 'alertdialog');
        document.body.append(alert);
        button('OK', alert).focus();

        expect(currentOpener()).toBe(save);
    });
});

describe('trackFocus', () => {
    it('listens to the document only once', async () => {
        const { trackFocus } = await fresh();
        const doc = document.implementation.createHTMLDocument('x');
        const added = vi.spyOn(doc, 'addEventListener');

        trackFocus(doc);
        trackFocus(doc);

        expect(added).toHaveBeenCalledOnce();
        expect(added.mock.calls[0]?.[0]).toBe('focusin');
    });
});

describe('returnFocus', () => {
    it('focuses a control that is still on the page', async () => {
        const { returnFocus } = await fresh();
        const save = button('Save');

        expect(returnFocus(save)).toBe(true);
        expect(save).toHaveFocus();
    });

    it('gives up without a control', async () => {
        const { returnFocus } = await fresh();

        expect(returnFocus(null)).toBe(false);
    });

    it('gives up on a control that left the page', async () => {
        const { returnFocus } = await fresh();
        const save = button('Save');
        save.remove();

        expect(returnFocus(save)).toBe(false);
    });

    it('gives up on a control inside a hidden or inert part', async () => {
        const { returnFocus } = await fresh();
        const hidden = document.createElement('div');
        hidden.hidden = true;
        const inert = document.createElement('div');
        inert.setAttribute('inert', '');
        document.body.append(hidden, inert);

        expect(returnFocus(button('A', hidden))).toBe(false);
        expect(returnFocus(button('B', inert))).toBe(false);
    });

    it('gives up on a disabled control', async () => {
        const { returnFocus } = await fresh();
        const save = button('Save');
        save.disabled = true;

        expect(returnFocus(save)).toBe(false);
        expect(save).not.toHaveFocus();
    });
});
