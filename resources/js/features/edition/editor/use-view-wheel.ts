import {
    useCallback,
    useEffect,
    type Dispatch,
    type SetStateAction,
} from 'react';

import { zoomAround, type View } from '@/features/edition/editor/stage-view';

export const useViewWheel = (
    host: HTMLDivElement | null,
    enabled: boolean,
    relative: (clientX: number, clientY: number) => { cx: number; cy: number },
    setView: Dispatch<SetStateAction<View>>,
): void => {
    useEffect(() => {
        if (host === null || !enabled) {
            return;
        }
        const onWheel = (event: WheelEvent): void => {
            const target = event.target;
            // The photo on the stage zooms itself with a pinch.
            if (
                target instanceof Element &&
                target.closest('[data-focus-view]') &&
                event.ctrlKey
            ) {
                return;
            }
            event.preventDefault();
            if (event.ctrlKey || event.metaKey) {
                const { cx, cy } = relative(event.clientX, event.clientY);
                setView((now) =>
                    zoomAround(
                        now,
                        now.zoom * Math.exp(-event.deltaY / 200),
                        cx,
                        cy,
                    ),
                );
            } else {
                setView((now) => ({
                    ...now,
                    x: now.x - event.deltaX,
                    y: now.y - event.deltaY,
                }));
            }
        };
        host.addEventListener('wheel', onWheel, { passive: false });

        return () => host.removeEventListener('wheel', onWheel);
    }, [host, enabled, relative, setView]);
};

export const useRelative = (host: HTMLDivElement | null) =>
    useCallback(
        (clientX: number, clientY: number): { cx: number; cy: number } => {
            const rect = host?.getBoundingClientRect();
            if (rect === undefined) {
                return { cx: 0, cy: 0 };
            }

            return {
                cx: clientX - rect.left - rect.width / 2,
                cy: clientY - rect.top - rect.height / 2,
            };
        },
        [host],
    );
