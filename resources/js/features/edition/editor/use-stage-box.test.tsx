import { act, renderHook } from '@testing-library/react';

import { useStageBox } from './use-stage-box';

describe('useStageBox', () => {
    it('follows the size of the stage and stops when it goes', () => {
        let report: ResizeObserverCallback = () => undefined;
        const disconnect = vi.fn();
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: ResizeObserverCallback) {
                    report = callback;
                }

                observe = vi.fn();

                unobserve = vi.fn();

                disconnect = disconnect;
            },
        );
        const host = document.createElement('div');
        const { result, unmount } = renderHook(() => useStageBox(host));

        expect(result.current).toEqual({ w: 0, h: 0 });

        act(() =>
            report(
                [
                    {
                        contentRect: DOMRectReadOnly.fromRect({
                            width: 300,
                            height: 200,
                        }),
                        target: host,
                        borderBoxSize: [],
                        contentBoxSize: [],
                        devicePixelContentBoxSize: [],
                    },
                ],
                new ResizeObserver(() => undefined),
            ),
        );

        expect(result.current).toEqual({ w: 300, h: 200 });

        unmount();

        expect(disconnect).toHaveBeenCalled();
        vi.unstubAllGlobals();
    });

    it('stays empty without a stage or without ResizeObserver', () => {
        expect(renderHook(() => useStageBox(null)).result.current).toEqual({
            w: 0,
            h: 0,
        });
    });
});
