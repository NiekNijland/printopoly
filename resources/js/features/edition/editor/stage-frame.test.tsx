import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StageFrame } from './stage-frame';
import type { StageGestures } from './use-frame-gestures';

const gestures = (): StageGestures => {
    return {
        label: 'Foto, pijltjes verschuiven, plus en min zoomen',
        announcement: 'Zoom 140%',
        onPan: vi.fn(),
        onNudge: vi.fn(),
        onZoomFactor: vi.fn(),
        onZoomStep: vi.fn(),
    };
};

const renderFrame = (handlers: StageGestures | undefined, used = vi.fn()) =>
    render(
        <StageFrame
            gestures={handlers}
            used={used}
            scale={1}
            zoom={1}
            widthMm={63}
            heightMm={88}
            bleedMm={3}
            overlay={({ pxPerMm }) => <p>{`overlay ${pxPerMm.toFixed(2)}`}</p>}
        >
            <p>kaart</p>
        </StageFrame>,
    );

const ctrlWheel = (node: Element, deltaY: number): void => {
    const event = createEvent.wheel(node);
    Object.defineProperties(event, {
        deltaY: { value: deltaY },
        ctrlKey: { value: true },
    });
    fireEvent(node, event);
};

describe('StageFrame', () => {
    it('draws the element at its scale with the overlay over it, and is no focus stop without gestures', () => {
        renderFrame(undefined);

        expect(screen.getByText('kaart')).toBeInTheDocument();
        expect(screen.getByText('overlay 3.78')).toBeInTheDocument();
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    it('zooms the photo with a trackpad pinch and says the photo was used', () => {
        const handlers = gestures();
        const used = vi.fn();
        renderFrame(handlers, used);

        ctrlWheel(screen.getByRole('group'), -200);

        expect(handlers.onZoomFactor).toHaveBeenCalledWith(Math.exp(1));
        expect(used).toHaveBeenCalledTimes(1);
    });

    it('ignores other keys and a pointer it did not see go down', () => {
        const handlers = gestures();
        renderFrame(handlers);
        const frame = screen.getByRole('group');

        fireEvent.keyDown(frame, { key: 'a' });
        fireEvent.pointerMove(frame, { pointerId: 9, clientX: 5, clientY: 5 });
        fireEvent.pointerDown(frame, { pointerId: 1, clientX: 0, clientY: 0 });
        fireEvent.pointerUp(frame, { pointerId: 1 });
        fireEvent.pointerMove(frame, { pointerId: 1, clientX: 5, clientY: 5 });

        expect(handlers.onNudge).not.toHaveBeenCalled();
        expect(handlers.onZoomStep).not.toHaveBeenCalled();
        expect(handlers.onPan).not.toHaveBeenCalled();
    });

    it('nudges with the arrow keys and zooms with plus and minus', async () => {
        const user = userEvent.setup();
        const handlers = gestures();

        renderFrame(handlers);
        screen.getByRole('group').focus();
        await user.keyboard('{ArrowLeft}{ArrowDown}+-');

        expect(handlers.onNudge).toHaveBeenNthCalledWith(1, 'left');
        expect(handlers.onNudge).toHaveBeenNthCalledWith(2, 'down');
        expect(handlers.onZoomStep).toHaveBeenNthCalledWith(1, 1);
        expect(handlers.onZoomStep).toHaveBeenNthCalledWith(2, -1);
    });

    it('pans by the distance dragged, in mm', () => {
        const handlers = gestures();

        renderFrame(handlers);
        const frame = screen.getByRole('group');

        fireEvent.pointerDown(frame, {
            pointerId: 1,
            clientX: 100,
            clientY: 100,
        });
        fireEvent.pointerMove(frame, {
            pointerId: 1,
            clientX: 100 + (96 / 25.4) * 5,
            clientY: 100,
        });

        // Without layout the scale is 1, so 5 mm of pointer movement is 5 mm of photo.
        const [dx, dy] = vi.mocked(handlers.onPan).mock.calls[0] ?? [];
        expect(dx).toBeCloseTo(5, 5);
        expect(dy).toBe(0);
    });

    it('zooms by the factor two fingers move apart', () => {
        const handlers = gestures();

        renderFrame(handlers);
        const frame = screen.getByRole('group');

        fireEvent.pointerDown(frame, { pointerId: 1, clientX: 0, clientY: 0 });
        fireEvent.pointerDown(frame, {
            pointerId: 2,
            clientX: 100,
            clientY: 0,
        });
        fireEvent.pointerMove(frame, {
            pointerId: 2,
            clientX: 100,
            clientY: 0,
        });
        fireEvent.pointerMove(frame, {
            pointerId: 2,
            clientX: 150,
            clientY: 0,
        });

        expect(handlers.onZoomFactor).toHaveBeenCalledWith(1.5);
        expect(handlers.onPan).not.toHaveBeenCalled();
    });
});
