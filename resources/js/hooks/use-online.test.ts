import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useOnline } from './use-online';

const goOnline = (onLine: boolean): void => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(onLine);
    window.dispatchEvent(new Event(onLine ? 'online' : 'offline'));
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useOnline', () => {
    it('answers what the browser says now', () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

        expect(renderHook(() => useOnline()).result.current).toBe(false);
    });

    it('follows the browser going offline and back online', () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
        const { result } = renderHook(() => useOnline());
        expect(result.current).toBe(true);

        act(() => goOnline(false));
        expect(result.current).toBe(false);

        act(() => goOnline(true));
        expect(result.current).toBe(true);
    });

    it('stops listening once unmounted', () => {
        const removed = vi.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() => useOnline());

        unmount();

        const types = removed.mock.calls.map(([type]) => type);
        expect(types).toEqual(expect.arrayContaining(['online', 'offline']));
    });
});
