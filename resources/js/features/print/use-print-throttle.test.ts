import { act, renderHook } from '@testing-library/react';

import { usePrintThrottle } from './use-print-throttle';

describe('usePrintThrottle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('counts down and tries again by itself at zero (bug 4 of test round 3)', () => {
        const retry = vi.fn();
        const { result } = renderHook(() => usePrintThrottle());

        expect(result.current.throttled).toBe(false);
        act(() => {
            result.current.hold(3, retry);
        });
        expect(result.current.throttled).toBe(true);
        expect(result.current.seconds).toBe(3);

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(result.current.seconds).toBe(2);
        expect(retry).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(2000);
        });
        expect(retry).toHaveBeenCalledOnce();
        expect(result.current.throttled).toBe(false);
        expect(result.current.seconds).toBe(0);
    });

    it('tries again at once when there is nothing to wait for', () => {
        const retry = vi.fn();
        const { result } = renderHook(() => usePrintThrottle());

        act(() => {
            result.current.hold(0, retry);
        });
        act(() => {
            vi.advanceTimersByTime(0);
        });
        expect(retry).toHaveBeenCalledOnce();
    });

    it('tries again now when asked, and only once', () => {
        const retry = vi.fn();
        const { result } = renderHook(() => usePrintThrottle());

        act(() => {
            result.current.hold(30, retry);
        });
        act(() => {
            result.current.retryNow();
        });
        expect(retry).toHaveBeenCalledOnce();
        expect(result.current.throttled).toBe(false);
        act(() => {
            vi.advanceTimersByTime(31_000);
            result.current.retryNow();
        });
        expect(retry).toHaveBeenCalledOnce();
    });
});
