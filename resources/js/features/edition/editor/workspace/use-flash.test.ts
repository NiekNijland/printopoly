import { act, renderHook } from '@testing-library/react';

import { useFlash } from './use-flash';

describe('useFlash', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows a note for two seconds', () => {
        const { result } = renderHook(() => useFlash());

        expect(result.current.flash).toBeNull();

        act(() => {
            result.current.showFlash('Bewaard');
        });

        expect(result.current.flash).toBe('Bewaard');

        act(() => {
            vi.advanceTimersByTime(1999);
        });

        expect(result.current.flash).toBe('Bewaard');

        act(() => {
            vi.advanceTimersByTime(1);
        });

        expect(result.current.flash).toBeNull();
    });

    it('starts the time again for a new note, also with the same text', () => {
        const { result } = renderHook(() => useFlash());

        act(() => {
            result.current.showFlash('Bewaard', 3000);
        });
        act(() => {
            vi.advanceTimersByTime(2500);
        });
        act(() => {
            result.current.showFlash('Bewaard', 3000);
        });
        act(() => {
            vi.advanceTimersByTime(2500);
        });

        expect(result.current.flash).toBe('Bewaard');

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current.flash).toBeNull();
    });

    it('clears its timer when the editor closes', () => {
        const { result, unmount } = renderHook(() => useFlash());

        act(() => {
            result.current.showFlash('Bewaard');
        });
        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
