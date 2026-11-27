import { useCallback, useEffect, useState } from 'react';

type Throttle = { until: number; retry: () => void };

type PrintThrottle = {
    throttled: boolean;
    seconds: number;
    hold: (seconds: number, retry: () => void) => void;
    retryNow: () => void;
};

/** "Too many requests": the countdown next to the button; at zero the page tries again by itself (bug 4 of test round 3). */
export const usePrintThrottle = (): PrintThrottle => {
    const [throttle, setThrottle] = useState<Throttle | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (throttle === null) {
            return;
        }

        const tick = () => {
            const at = Date.now();

            if (at >= throttle.until) {
                setThrottle(null);
                throttle.retry();

                return;
            }
            setNow(at);
        };
        const timer = window.setInterval(tick, 1000);
        const due =
            throttle.until <= Date.now() ? window.setTimeout(tick, 0) : 0;

        return () => {
            window.clearInterval(timer);
            window.clearTimeout(due);
        };
    }, [throttle]);

    const hold = useCallback((seconds: number, retry: () => void) => {
        setThrottle({ until: Date.now() + seconds * 1000, retry });
        setNow(Date.now());
    }, []);

    const retryNow = (): void => {
        if (throttle !== null) {
            setThrottle(null);
            throttle.retry();
        }
    };

    return {
        throttled: throttle !== null,
        seconds:
            throttle === null
                ? 0
                : Math.max(0, Math.ceil((throttle.until - now) / 1000)),
        hold,
        retryNow,
    };
};
