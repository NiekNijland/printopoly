import { createEvent, fireEvent, renderHook } from '@testing-library/react';

import { FIT, type View } from './stage-view';
import { useRelative, useViewWheel } from './use-view-wheel';

const wheel = (
    node: Element,
    init: { deltaX?: number; deltaY: number; ctrlKey?: boolean },
): Event => {
    const event = createEvent.wheel(node);
    Object.defineProperties(event, {
        deltaX: { value: init.deltaX ?? 0 },
        deltaY: { value: init.deltaY },
        ctrlKey: { value: init.ctrlKey ?? false },
        metaKey: { value: false },
        clientX: { value: 60 },
        clientY: { value: 40 },
    });
    fireEvent(node, event);

    return event;
};

const setup = (enabled = true) => {
    const host = document.createElement('div');
    const photo = host.appendChild(document.createElement('div'));
    photo.setAttribute('data-focus-view', '');
    let view: View = FIT;
    const setView = vi.fn((next: View | ((now: View) => View)) => {
        view = typeof next === 'function' ? next(view) : next;
    });
    renderHook(() =>
        useViewWheel(host, enabled, (x, y) => ({ cx: x, cy: y }), setView),
    );

    return { host, photo, setView, view: () => view };
};

describe('useViewWheel', () => {
    it('zooms around the pointer with Ctrl and moves with the wheel alone', () => {
        const { host, view } = setup();

        expect(
            wheel(host, { deltaY: -200 * Math.log(2), ctrlKey: true })
                .defaultPrevented,
        ).toBe(true);
        expect(view()).toEqual({ zoom: 2, x: -60, y: -40 });

        wheel(host, { deltaX: 5, deltaY: 10 });

        expect(view()).toEqual({ zoom: 2, x: -65, y: -50 });
    });

    it('leaves a pinch on the photo to the photo, and does nothing when off', () => {
        const { photo, setView } = setup();

        wheel(photo, { deltaY: -100, ctrlKey: true });

        expect(setView).not.toHaveBeenCalled();

        const off = setup(false);
        wheel(off.host, { deltaY: -100 });

        expect(off.setView).not.toHaveBeenCalled();
    });
});

describe('useRelative', () => {
    it('measures from the middle of the stage, and from 0 without one', () => {
        const host = document.createElement('div');
        host.getBoundingClientRect = () =>
            DOMRect.fromRect({ x: 10, y: 20, width: 100, height: 50 });

        expect(
            renderHook(() => useRelative(host)).result.current(70, 50),
        ).toEqual({ cx: 10, cy: 5 });
        expect(
            renderHook(() => useRelative(null)).result.current(70, 50),
        ).toEqual({ cx: 0, cy: 0 });
    });
});
