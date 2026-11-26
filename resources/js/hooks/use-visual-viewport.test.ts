import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mediaQueryList } from '@/testing/media-query';
import { useVisualViewport } from './use-visual-viewport';

const viewportOf = (height: number, touch: boolean): EventTarget => {
    const viewport = Object.assign(new EventTarget(), {
        height,
        offsetTop: 0,
    });

    vi.stubGlobal('visualViewport', viewport);
    vi.stubGlobal('matchMedia', (query: string) =>
        mediaQueryList(query, touch),
    );
    vi.stubGlobal('innerHeight', 800);

    return viewport;
};

describe('useVisualViewport', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reports no keyboard while the visual viewport fills the window', () => {
        viewportOf(800, true);

        const { result } = renderHook(() => useVisualViewport());

        expect(result.current).toEqual({ height: null, keyboardOpen: false });
    });

    it('reports the visible height while an on-screen keyboard covers the window', () => {
        const viewport = viewportOf(800, true);
        const { result } = renderHook(() => useVisualViewport());

        Object.assign(viewport, { height: 450 });
        act(() => {
            viewport.dispatchEvent(new Event('resize'));
        });

        expect(result.current).toEqual({ height: 450, keyboardOpen: true });
    });

    it('ignores a smaller viewport on a device without a touch pointer', () => {
        const viewport = viewportOf(800, false);
        const { result } = renderHook(() => useVisualViewport());

        Object.assign(viewport, { height: 450 });
        act(() => {
            viewport.dispatchEvent(new Event('resize'));
        });

        expect(result.current.keyboardOpen).toBe(false);
    });

    it('does nothing in a browser without a visual viewport', () => {
        vi.stubGlobal('visualViewport', undefined);

        const { result } = renderHook(() => useVisualViewport());

        expect(result.current).toEqual({ height: null, keyboardOpen: false });
    });
});
