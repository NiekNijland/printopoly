import { render, renderHook, screen, waitFor } from '@testing-library/react';

import {
    focusField,
    useChosenInView,
    useFocusRequest,
    usePhoneScreenFocus,
    usePreviewReturn,
} from './use-workspace-focus';

describe('focusField', () => {
    it('focuses and selects a field, and says when there is none', () => {
        render(<input data-field="name" defaultValue="Molenweg" />);
        const input = screen.getByRole('textbox');

        expect(focusField('[data-field="name"]')).toBe(true);
        expect(input).toHaveFocus();
        expect(input).toHaveProperty('selectionEnd', 8);
        expect(focusField('[data-field="text"]')).toBe(false);
    });
});

describe('useFocusRequest', () => {
    it('focuses the asked field, else the focus view', async () => {
        render(
            <>
                <button type="button" data-focus-view>
                    view
                </button>
                <input data-field="name" />
            </>,
        );
        const initialProps: { field: string | null } = { field: null };
        const { rerender } = renderHook(
            ({ field }: { field: string | null }) =>
                useFocusRequest(field === null ? null : { n: 1, field }),
            { initialProps },
        );

        rerender({ field: 'name' });
        await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());

        rerender({ field: 'photo' });
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'view' })).toHaveFocus(),
        );
    });
});

describe('usePhoneScreenFocus', () => {
    it('moves a lost focus to the head of the element screen on a phone', async () => {
        render(
            <p tabIndex={-1} data-phone-title>
                Molenweg
            </p>,
        );
        const { rerender } = renderHook(
            ({ mobileElement }) => usePhoneScreenFocus(mobileElement, false),
            { initialProps: { mobileElement: false } },
        );

        rerender({ mobileElement: true });

        await waitFor(() => expect(screen.getByText('Molenweg')).toHaveFocus());
    });

    it('moves the focus back to the chosen row on the overview', async () => {
        render(
            <div data-scroll-list>
                <button type="button" aria-current="true">
                    Molenweg
                </button>
            </div>,
        );
        const { rerender } = renderHook(
            ({ mobileElement }) => usePhoneScreenFocus(mobileElement, false),
            { initialProps: { mobileElement: true } },
        );

        rerender({ mobileElement: false });

        await waitFor(() => expect(screen.getByRole('button')).toHaveFocus());
    });

    it('leaves the focus alone on a wide screen', async () => {
        render(
            <p tabIndex={-1} data-phone-title>
                Molenweg
            </p>,
        );
        const { rerender } = renderHook(
            ({ mobileElement }) => usePhoneScreenFocus(mobileElement, true),
            { initialProps: { mobileElement: false } },
        );

        rerender({ mobileElement: true });
        await new Promise((resolve) => requestAnimationFrame(resolve));

        expect(document.body).toHaveFocus();
    });
});

describe('useChosenInView', () => {
    it('scrolls only the list to bring the chosen row back', () => {
        render(
            <div data-testid="list" data-scroll-list>
                <div data-list-sticky />
                <button type="button" aria-current="true">
                    Molenweg
                </button>
            </div>,
        );
        const list = screen.getByTestId('list');
        Object.defineProperties(list, {
            scrollHeight: { value: 1000 },
            clientHeight: { value: 200 },
            getBoundingClientRect: {
                value: () => DOMRect.fromRect({ y: 0, height: 200 }),
            },
        });
        Object.defineProperty(
            screen.getByRole('button'),
            'getBoundingClientRect',
            {
                value: () => DOMRect.fromRect({ y: 500, height: 40 }),
            },
        );

        renderHook(() => useChosenInView('space.05'));

        expect(list.scrollTop).toBeGreaterThan(0);
    });

    it('does nothing without a list that scrolls', () => {
        expect(() =>
            renderHook(() => useChosenInView('space.05')),
        ).not.toThrow();
    });
});

describe('usePreviewReturn', () => {
    it('puts the focus back on what opened the preview', () => {
        render(<button type="button">Voorbeeld</button>);
        const opener = screen.getByRole('button');
        Object.defineProperty(opener, 'getClientRects', {
            value: () => [DOMRect.fromRect({ width: 10, height: 10 })],
        });
        const open = vi.fn<() => void>();
        const { result } = renderHook(() => usePreviewReturn(open));

        opener.focus();
        result.current.openPreview();
        opener.blur();
        result.current.returnFromPreview();

        expect(open).toHaveBeenCalledOnce();
        expect(opener).toHaveFocus();
    });

    it('falls back to the opener when nothing is visible, and to nothing from the page body', () => {
        render(<button type="button">Menu</button>);
        const { result } = renderHook(() => usePreviewReturn(() => undefined));

        result.current.openPreview();
        result.current.returnFromPreview();

        expect(document.body).toHaveFocus();

        screen.getByRole('button').focus();
        result.current.openPreview();
        screen.getByRole('button').blur();
        result.current.returnFromPreview();

        expect(screen.getByRole('button')).toHaveFocus();
    });
});
