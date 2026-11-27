import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type PointerEvent,
    type RefObject,
} from 'react';

import {
    canSwapKeys,
    firstSwapTarget,
    nextSwapTarget,
    positionOf,
} from '@/features/edition/editor/board-grid';
import { useTranslation } from '@/hooks/use-translation';
import { swapTargets } from '@/lib/render/editor-swap';

/** A pointer that moves this far (px) with a mouse, or is held this long (ms) on touch, starts a drag. */
const DRAG_DISTANCE = 6;
const LONG_PRESS_MS = 350;

export type BoardDrag = { from: string; over: string | null };

type Press = {
    key: string;
    x: number;
    y: number;
    touch: boolean;
    timer: number | undefined;
};

type SwapContext = {
    label: (key: string) => string;
    setStatus: (status: string) => void;
    doSwap: (from: string, to: string) => void;
    drop: (from: string, over: string | null) => void;
};

const useKeyboardSwap = (
    selected: string,
    { label, setStatus, doSwap }: SwapContext,
) => {
    const t = useTranslation();
    // Keyboard swap: the space being moved and the one it would swap with.
    const [swapFrom, setSwapFrom] = useState<string | null>(null);
    const [swapTarget, setSwapTarget] = useState<string | null>(null);

    const startSwap = (): void => {
        const first = firstSwapTarget(selected);

        if (first === undefined) {
            setStatus(t('editor.swap_not_allowed'));

            return;
        }
        setSwapFrom(selected);
        setSwapTarget(first);
        setStatus(
            t('editor.swap_pick', { name: label(selected) }) +
                ' ' +
                t('editor.swap_target', { name: label(first) }),
        );
    };

    const cancelSwap = (message: boolean): void => {
        setSwapFrom(null);
        setSwapTarget(null);
        if (message) {
            setStatus(t('editor.swap_cancelled'));
        }
    };

    /** Keys of the keyboard swap: arrows pick the target among spaces of the same kind. */
    const onSwapKey = (event: KeyboardEvent): boolean => {
        if (swapFrom === null || swapTarget === null) {
            return false;
        }
        if (event.key === 'Escape') {
            cancelSwap(true);
        } else if (event.key === 'Enter' || event.key === ' ') {
            doSwap(swapFrom, swapTarget);
            cancelSwap(false);
        } else if (event.key.startsWith('Arrow')) {
            const next = nextSwapTarget(
                swapFrom,
                swapTarget,
                event.key === 'ArrowRight' || event.key === 'ArrowDown',
            );

            if (next !== undefined) {
                setSwapTarget(next);
                setStatus(t('editor.swap_target', { name: label(next) }));
            }
        } else if (event.key !== 'Tab') {
            return true;
        } else {
            cancelSwap(false);

            return false;
        }
        event.preventDefault();
        event.stopPropagation();

        return true;
    };

    return { swapFrom, swapTarget, startSwap, onSwapKey };
};

const useBlockTouchScroll = (
    grid: RefObject<HTMLDivElement | null>,
    dragging: RefObject<string | null>,
): void => {
    // While a drag is on, a touch must not scroll the page.
    useEffect(() => {
        const node = grid.current;
        const block = (event: TouchEvent): void => {
            if (dragging.current !== null && event.cancelable) {
                event.preventDefault();
            }
        };

        node?.addEventListener('touchmove', block, { passive: false });

        return () => node?.removeEventListener('touchmove', block);
    }, [grid, dragging]);
};

const canPress = (
    key: string,
    event: PointerEvent,
    canDrag: boolean,
): boolean => {
    const position = positionOf(key);

    return !(
        !canDrag ||
        position === null ||
        swapTargets(position).length === 0 ||
        (event.pointerType === 'mouse' && event.button !== 0)
    );
};

const keyUnder = (event: PointerEvent): string | null =>
    document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-key]')?.dataset.key ?? null;

const usePointerSwap = (
    grid: RefObject<HTMLDivElement | null>,
    canDrag: boolean,
    { label, setStatus, drop }: SwapContext,
) => {
    const t = useTranslation();
    // Pointer swap: the space being dragged and the one under the pointer.
    const [drag, setDrag] = useState<BoardDrag | null>(null);
    const press = useRef<Press | null>(null);
    const dragging = useRef<string | null>(null);
    const justDragged = useRef(false);

    const stopDrag = (): void => {
        window.clearTimeout(press.current?.timer);
        press.current = null;
        dragging.current = null;
        setDrag(null);
    };

    const beginDrag = (key: string): void => {
        dragging.current = key;
        setDrag({ from: key, over: null });
        setStatus(t('editor.swap_dragging', { name: label(key) }));
    };

    useBlockTouchScroll(grid, dragging);

    const pressCell = (key: string, event: PointerEvent): void => {
        if (!canPress(key, event, canDrag)) {
            return;
        }
        const touch = event.pointerType !== 'mouse';

        press.current = {
            key,
            x: event.clientX,
            y: event.clientY,
            touch,
            timer: touch
                ? window.setTimeout(() => beginDrag(key), LONG_PRESS_MS)
                : undefined,
        };
    };

    const onPointerMove = (event: PointerEvent): void => {
        const start = press.current;

        if (start !== null && dragging.current === null) {
            const moved = Math.hypot(
                event.clientX - start.x,
                event.clientY - start.y,
            );

            if (start.touch && moved > DRAG_DISTANCE * 2) {
                // The finger moved before the long press: it is a scroll, not a drag.
                stopDrag();
            } else if (!start.touch && moved > DRAG_DISTANCE) {
                beginDrag(start.key);
            }
        }
        if (dragging.current !== null) {
            setDrag({ from: dragging.current, over: keyUnder(event) });
        }
    };

    const onPointerUp = (): void => {
        const from = dragging.current;

        if (from !== null) {
            justDragged.current = true;
            drop(from, drag?.over ?? null);
        }
        stopDrag();
    };

    const consumeDrag = (): boolean => {
        const was = justDragged.current;
        justDragged.current = false;

        return was;
    };

    return {
        drag,
        pressCell,
        onPointerMove,
        onPointerUp,
        stopDrag,
        consumeDrag,
    };
};

export const useBoardSwap = ({
    grid,
    selected,
    label,
    onSwap,
}: {
    grid: RefObject<HTMLDivElement | null>;
    selected: string;
    label: (key: string) => string;
    onSwap: ((from: string, to: string) => void) | undefined;
}) => {
    const t = useTranslation();
    const [status, setStatus] = useState('');

    const doSwap = (from: string, to: string): void => {
        if (onSwap === undefined || !canSwapKeys(from, to)) {
            return;
        }
        const names = { a: label(from), b: label(to) };

        onSwap(from, to);
        setStatus(t('editor.swap_done', names));
    };
    const drop = (from: string, over: string | null): void => {
        if (over === null || over === from) {
            return;
        }
        if (canSwapKeys(from, over)) {
            doSwap(from, over);
        } else {
            setStatus(t('editor.swap_not_allowed'));
        }
    };
    const context = { label, setStatus, doSwap, drop };

    return {
        status,
        ...useKeyboardSwap(selected, context),
        ...usePointerSwap(grid, onSwap !== undefined, context),
    };
};
