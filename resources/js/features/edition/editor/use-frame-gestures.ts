import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type PointerEvent,
} from 'react';

import type { Direction } from '@/lib/render/photos-transform';

export type StageGestures = {
    /** Accessible name, such as "Foto, pijltjes verschuiven, plus en min zoomen". */
    label: string;
    /** Text for the live region after a change ("Zoom 140%"). */
    announcement: string;
    onPan: (dxMm: number, dyMm: number) => void;
    onNudge: (direction: Direction) => void;
    /** Pinch: the factor by which the zoom changes. */
    onZoomFactor: (factor: number) => void;
    /** Plus and minus keys: +1 or -1 step. */
    onZoomStep: (direction: 1 | -1) => void;
    /** The hint on the photo, "Sleep om te verschuiven, knijp om te zoomen" (ronde 3, UX 1). */
    hint?: string;
};

const KEY_DIRECTION: Record<string, Direction> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
};

const keyGesture = (
    event: KeyboardEvent<HTMLDivElement>,
    gestures: StageGestures,
): void => {
    const direction = KEY_DIRECTION[event.key];
    if (direction !== undefined) {
        event.preventDefault();
        gestures.onNudge(direction);
    } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        gestures.onZoomStep(1);
    } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        gestures.onZoomStep(-1);
    }
};

const useFrameWheel = (
    gestures: StageGestures | undefined,
    used: () => void,
) => {
    // A pinch on a trackpad arrives as a wheel with Ctrl; the page itself never zooms on the photo.
    const onWheel = (event: WheelEvent): void => {
        if (gestures === undefined || !event.ctrlKey) {
            return;
        }
        event.preventDefault();
        gestures.onZoomFactor(Math.exp(-event.deltaY / 200));
        used();
    };
    const latestWheel = useRef(onWheel);
    useEffect(() => {
        latestWheel.current = onWheel;
    });
    const [frame, setFrame] = useState<HTMLDivElement | null>(null);
    useEffect(() => {
        if (frame === null) {
            return;
        }
        const listener = (event: WheelEvent): void =>
            latestWheel.current(event);
        frame.addEventListener('wheel', listener, { passive: false });

        return () => frame.removeEventListener('wheel', listener);
    }, [frame]);

    return setFrame;
};

export const useFrameGestures = (
    gestures: StageGestures | undefined,
    pxPerMm: number,
    used: () => void,
) => {
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinch = useRef<number | null>(null);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
        if (gestures === undefined) {
            return;
        }
        if ('setPointerCapture' in event.currentTarget) {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        pinch.current = null;
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
        const previous = pointers.current.get(event.pointerId);
        if (gestures === undefined || previous === undefined) {
            return;
        }
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            if (a === undefined || b === undefined) {
                return;
            }
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinch.current !== null && pinch.current > 0) {
                gestures.onZoomFactor(distance / pinch.current);
                used();
            }
            pinch.current = distance;

            return;
        }
        gestures.onPan(
            (event.clientX - previous.x) / pxPerMm,
            (event.clientY - previous.y) / pxPerMm,
        );
        used();
    };

    const setFrame = useFrameWheel(gestures, used);

    const onPointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
        pointers.current.delete(event.pointerId);
        pinch.current = null;
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (gestures !== undefined) {
            keyGesture(event, gestures);
        }
    };

    return {
        setFrame,
        onPointerDown,
        onPointerMove,
        onPointerUp: onPointerEnd,
        onPointerCancel: onPointerEnd,
        onKeyDown,
    };
};
