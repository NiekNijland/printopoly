import { fireEvent, render, screen } from '@testing-library/react';

import { useFrameGestures, type StageGestures } from './use-frame-gestures';

const Frame = ({
    gestures,
    used,
}: {
    gestures: StageGestures | undefined;
    used: () => void;
}) => {
    const { setFrame, ...handlers } = useFrameGestures(gestures, 2, used);

    return <div ref={setFrame} data-testid="frame" {...handlers} />;
};

const gestures = (): StageGestures => ({
    label: 'Foto',
    announcement: '',
    onPan: vi.fn(),
    onNudge: vi.fn(),
    onZoomFactor: vi.fn(),
    onZoomStep: vi.fn(),
});

describe('useFrameGestures', () => {
    it('pans in mm at the given pixels per mm and says the photo was used', () => {
        const handlers = gestures();
        const used = vi.fn();
        render(<Frame gestures={handlers} used={used} />);
        const frame = screen.getByTestId('frame');

        fireEvent.pointerDown(frame, { pointerId: 1, clientX: 0, clientY: 0 });
        fireEvent.pointerMove(frame, { pointerId: 1, clientX: 8, clientY: 4 });

        expect(handlers.onPan).toHaveBeenCalledWith(4, 2);
        expect(used).toHaveBeenCalledTimes(1);
    });

    it('nudges with the arrows and zooms with = and _ too', () => {
        const handlers = gestures();
        render(<Frame gestures={handlers} used={vi.fn()} />);
        const frame = screen.getByTestId('frame');

        fireEvent.keyDown(frame, { key: 'ArrowUp' });
        fireEvent.keyDown(frame, { key: 'ArrowRight' });
        fireEvent.keyDown(frame, { key: '=' });
        fireEvent.keyDown(frame, { key: '_' });

        expect(handlers.onNudge).toHaveBeenNthCalledWith(1, 'up');
        expect(handlers.onNudge).toHaveBeenNthCalledWith(2, 'right');
        expect(handlers.onZoomStep).toHaveBeenNthCalledWith(1, 1);
        expect(handlers.onZoomStep).toHaveBeenNthCalledWith(2, -1);
    });

    it('does nothing without gestures', () => {
        const used = vi.fn();
        render(<Frame gestures={undefined} used={used} />);
        const frame = screen.getByTestId('frame');

        fireEvent.pointerDown(frame, { pointerId: 1, clientX: 0, clientY: 0 });
        fireEvent.pointerMove(frame, { pointerId: 1, clientX: 8, clientY: 4 });
        fireEvent.keyDown(frame, { key: 'ArrowUp' });
        fireEvent.wheel(frame, { deltaY: 10 });

        expect(used).not.toHaveBeenCalled();
    });
});
