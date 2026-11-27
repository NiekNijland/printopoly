import { useEffect, useRef } from 'react';

import { listScrollDelta } from '@/features/edition/editor/list-scroll';
import type { FocusRequest } from '@/features/edition/editor/workspace/navigation';

export const focusField = (selector: string): boolean => {
    const node = document.querySelector<HTMLElement>(selector);
    if (node === null) {
        return false;
    }
    node.focus();
    if (node instanceof HTMLInputElement) {
        node.select();
    }

    return true;
};

// After a row of the Controle list: focus goes to the field it is about, else the focus view.
export const useFocusRequest = (focusRequest: FocusRequest | null): void => {
    useEffect(() => {
        if (focusRequest === null) {
            return undefined;
        }
        const frameId = requestAnimationFrame(() => {
            const pick = (selector: string) =>
                document.querySelector<HTMLElement>(selector);
            const found =
                pick(`[data-field="${focusRequest.field}"]`) ??
                pick('[data-focus-view]') ??
                pick('[data-field]') ??
                pick('[data-preview]');
            found?.focus();
        });

        return () => cancelAnimationFrame(frameId);
    }, [focusRequest]);
};

// Phone: a switch between the overview and an element moves the focus to the head of the new screen, or back
// to the chosen row, instead of leaving it on `body` where single letters are shortcuts (bug 16, ronde 3).
export const usePhoneScreenFocus = (
    mobileElement: boolean,
    wide: boolean,
): void => {
    const shownScreen = useRef(mobileElement);
    useEffect(() => {
        if (shownScreen.current === mobileElement) {
            return undefined;
        }
        shownScreen.current = mobileElement;
        if (wide) {
            return undefined;
        }
        const frame = requestAnimationFrame(() => {
            const active = document.activeElement;
            const lost =
                active === null ||
                active === document.body ||
                (active instanceof HTMLElement && active.offsetParent === null);
            if (!lost) {
                return;
            }
            const target = mobileElement
                ? document.querySelector<HTMLElement>('[data-phone-title]')
                : (document.querySelector<HTMLElement>(
                      '[data-scroll-list] [aria-current="true"]',
                  ) ??
                  document.querySelector<HTMLElement>(
                      '[data-key][tabindex="0"]',
                  ));
            target?.focus({ preventScroll: mobileElement });
        });

        return () => cancelAnimationFrame(frame);
    }, [mobileElement, wide]);
};

// A chosen element that scrolled out of its list (with J and K) comes back into view. Only the list scrolls,
// never the column around it, so the row Editie and the tabs stay in sight (bug 3).
export const useChosenInView = (key: string): void => {
    useEffect(() => {
        const list = document.querySelector<HTMLElement>('[data-scroll-list]');
        const row = list?.querySelector<HTMLElement>('[aria-current="true"]');

        if (
            list === null ||
            row === null ||
            row === undefined ||
            list.scrollHeight <= list.clientHeight
        ) {
            return;
        }
        // The search field sticks to the top of the list and covers what scrolls under it.
        const sticky =
            list.querySelector<HTMLElement>('[data-list-sticky]')
                ?.offsetHeight ?? 0;
        list.scrollTop += listScrollDelta(
            list.getBoundingClientRect(),
            row.getBoundingClientRect(),
            sticky,
        );
    }, [key]);
};

// Closing Voorbeeld puts the focus back on what opened it, or on a visible Voorbeeld button when that was a menu
// item or a shortcut (bug 30, B167).
export const usePreviewReturn = (open: () => void) => {
    const previewOpener = useRef<HTMLElement | null>(null);
    const openPreview = (): void => {
        const active = document.activeElement;
        previewOpener.current =
            active instanceof HTMLElement && active !== document.body
                ? active
                : null;
        open();
    };
    const returnFromPreview = (): void => {
        const visible = (node: HTMLElement | null | undefined) =>
            node !== null &&
            node !== undefined &&
            node.isConnected &&
            node.closest('[role="menu"]') === null &&
            node.getClientRects().length > 0;
        const opener = previewOpener.current;
        const target = [
            opener,
            ...document.querySelectorAll<HTMLElement>('[data-preview-toggle]'),
            ...document.querySelectorAll<HTMLElement>(
                'header [aria-haspopup="menu"]',
            ),
        ].find(visible);
        (target ?? opener)?.focus();
    };

    return { openPreview, returnFromPreview };
};
