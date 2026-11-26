/**
 * Where the focus goes back to when a dialog closes (bug 16, ronde 3). A dialog that was opened from a menu item
 * lost its opener: the item is gone once the menu closes, so the focus fell to `body` and single-letter
 * shortcuts then fired somewhere unexpected. The opener of an item in a menu is the button that opened the menu.
 */

let last: HTMLElement | null = null;
let tracking = false;

/** A menu item stands for the button that opened its menu; anything else for itself. */
const resolve = (element: HTMLElement): HTMLElement => {
    const menu = element.closest<HTMLElement>('[role="menu"]');
    if (menu !== null && menu.id !== '') {
        const trigger = element.ownerDocument.querySelector<HTMLElement>(
            `[aria-controls="${menu.id.replace(/"/g, '\\"')}"]`,
        );
        if (trigger !== null) {
            return trigger;
        }
    }

    return element;
};

const usable = (element: Element | null): element is HTMLElement => {
    return (
        element instanceof HTMLElement &&
        element !== element.ownerDocument.body &&
        element.closest('[role="dialog"], [role="alertdialog"]') === null
    );
};

/** Starts following the focus on the page, once, so a menu's button is known after the menu is gone. */
export const trackFocus = (doc: Document = document): void => {
    if (tracking) {
        return;
    }
    tracking = true;
    doc.addEventListener('focusin', (event) => {
        if (usable(event.target as Element | null)) {
            last = resolve(event.target as HTMLElement);
        }
    });
};

/** The control a dialog that opens now should give the focus back to. */
export const currentOpener = (doc: Document = document): HTMLElement | null => {
    const active = doc.activeElement;

    return usable(active) ? resolve(active) : last;
};

/** Puts the focus back on `element` when it is still on the page and can take it. */
export const returnFocus = (element: HTMLElement | null): boolean => {
    if (
        element === null ||
        !element.isConnected ||
        element.closest('[hidden], [inert]') !== null ||
        (element as HTMLButtonElement).disabled === true
    ) {
        return false;
    }
    element.focus();

    return element.ownerDocument.activeElement === element;
};
