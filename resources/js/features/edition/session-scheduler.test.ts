import { browserScheduler } from './session-scheduler';

describe('browserScheduler', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs a callback after its time', () => {
        const callback = vi.fn();
        browserScheduler.setTimeout(callback, 500);

        vi.advanceTimersByTime(499);
        expect(callback).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('cancels the timer it handed out, and ignores anything else', () => {
        const callback = vi.fn();
        const timer = browserScheduler.setTimeout(callback, 500);

        browserScheduler.clearTimeout('not a timer');
        browserScheduler.clearTimeout(timer);
        vi.advanceTimersByTime(500);

        expect(callback).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });
});
