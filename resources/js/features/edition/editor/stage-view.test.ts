import {
    FIT,
    MAX_ZOOM,
    MIN_ZOOM,
    createViewMove,
    fitScale,
    isOwnPress,
    zoomAround,
    type View,
} from './stage-view';

const drag = () => {
    let view: View = FIT;
    const pointers = new Map([[1, { x: 0, y: 0 }]]);
    const moved = { current: false };
    const move = createViewMove({
        pointers,
        moved,
        start: { x: 0, y: 0 },
        relative: (clientX, clientY) => ({ cx: clientX, cy: clientY }),
        setView: (next) => {
            view = typeof next === 'function' ? next(view) : next;
        },
    });

    return { move, pointers, moved, view: () => view };
};

describe('zoomAround', () => {
    it('keeps the point it zooms around in place and stays within the limits', () => {
        expect(zoomAround(FIT, 2, 10, 0)).toEqual({ zoom: 2, x: -10, y: 0 });
        expect(zoomAround(FIT, 100, 0, 0).zoom).toBe(MAX_ZOOM);
        expect(zoomAround(FIT, 0.01, 0, 0).zoom).toBe(MIN_ZOOM);
    });
});

describe('fitScale', () => {
    it('fits the element in the stage with room around it, never larger than 2.4', () => {
        expect(fitScale({ w: 0, h: 0 }, 100, 100, 1)).toBe(1);
        expect(fitScale({ w: 2000, h: 2000 }, 10, 10, 1)).toBe(2.4);
        expect(fitScale({ w: 64 + 96 / 2.54, h: 1000 }, 10, 10, 1)).toBeCloseTo(
            1,
        );
        expect(fitScale({ w: 65, h: 65 }, 1000, 1000, 1)).toBe(0.05);
    });
});

describe('isOwnPress', () => {
    it('keeps a press on the element with the element, but not one on the board around it', () => {
        const frame = document.createElement('div');
        frame.setAttribute('data-stage-frame', '');
        const photo = frame.appendChild(document.createElement('img'));
        const space = frame.appendChild(document.createElement('div'));
        space.setAttribute('data-surround-key', 'space.02');

        expect(isOwnPress(photo)).toBe(true);
        expect(isOwnPress(space)).toBe(false);
        expect(isOwnPress(document.createElement('div'))).toBe(false);
        expect(isOwnPress(null)).toBe(false);
    });
});

describe('createViewMove', () => {
    it('waits for a few pixels before it drags, then moves the view along', () => {
        const { move, moved, view } = drag();

        move({ pointerId: 1, clientX: 2, clientY: 0 });

        expect(moved.current).toBe(false);
        expect(view()).toEqual(FIT);

        move({ pointerId: 1, clientX: 12, clientY: 5 });
        move({ pointerId: 1, clientX: 15, clientY: 5 });

        expect(moved.current).toBe(true);
        expect(view()).toEqual({ zoom: 1, x: 13, y: 5 });
    });

    it('ignores a pointer it does not know', () => {
        const { move, view } = drag();

        move({ pointerId: 2, clientX: 50, clientY: 50 });

        expect(view()).toEqual(FIT);
    });

    it('pinches with two fingers around their middle', () => {
        const { move, pointers, moved, view } = drag();
        pointers.set(2, { x: 100, y: 0 });

        move({ pointerId: 2, clientX: 100, clientY: 0 });
        move({ pointerId: 2, clientX: 200, clientY: 0 });

        expect(moved.current).toBe(true);
        expect(view()).toEqual({ zoom: 2, x: -100, y: 0 });
    });
});
