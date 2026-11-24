import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ElementStage, type StageGestures } from './element-stage';

function gestures(): StageGestures {
    return {
        label: 'Foto, pijltjes verschuiven, plus en min zoomen',
        announcement: 'Zoom 140%',
        onPan: vi.fn(),
        onNudge: vi.fn(),
        onZoomFactor: vi.fn(),
        onZoomStep: vi.fn(),
    };
}

describe('ElementStage', () => {
    it('zooms the view with the buttons and fits it again, and a new element starts at fit', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <ElementStage widthMm={500} heightMm={500} zoomable viewKey="a">
                <p>bord</p>
            </ElementStage>,
        );
        const stage = screen.getByTestId('element-stage');
        const [, fit, zoomIn] = [
            ...stage.querySelectorAll('[data-stage-zoom] button'),
        ] as HTMLElement[];

        expect(stage).toHaveAttribute('data-zoom', '1');
        await user.click(zoomIn as HTMLElement);
        expect(Number(stage.getAttribute('data-zoom'))).toBeCloseTo(1.4);
        await user.click(fit as HTMLElement);
        expect(stage).toHaveAttribute('data-zoom', '1');

        await user.click(zoomIn as HTMLElement);
        rerender(
            <ElementStage widthMm={500} heightMm={500} zoomable viewKey="b">
                <p>bord</p>
            </ElementStage>,
        );
        expect(stage).toHaveAttribute('data-zoom', '1');
    });

    it('has no zoom without zoomable', () => {
        render(
            <ElementStage widthMm={63} heightMm={88}>
                <p>kaart</p>
            </ElementStage>,
        );

        expect(
            screen
                .getByTestId('element-stage')
                .querySelector('[data-stage-zoom]'),
        ).toBeNull();
    });

    it('is not a focus stop without a photo', () => {
        render(
            <ElementStage widthMm={63} heightMm={88}>
                <p>kaart</p>
            </ElementStage>,
        );

        expect(screen.queryByRole('group')).not.toBeInTheDocument();
        expect(screen.getByText('kaart')).toBeInTheDocument();
    });

    it('makes the photo frame one focus element with its own label and a live region', () => {
        const handlers = gestures();

        render(
            <ElementStage widthMm={63} heightMm={88} gestures={handlers}>
                <p>kaart</p>
            </ElementStage>,
        );

        expect(
            screen.getByRole('group', { name: handlers.label }),
        ).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('status')).toHaveTextContent('Zoom 140%');
    });

    it('nudges with the arrow keys and zooms with plus and minus', async () => {
        const user = userEvent.setup();
        const handlers = gestures();

        render(
            <ElementStage widthMm={63} heightMm={88} gestures={handlers}>
                <p>kaart</p>
            </ElementStage>,
        );
        screen.getByRole('group').focus();
        await user.keyboard('{ArrowLeft}{ArrowDown}+-');

        expect(handlers.onNudge).toHaveBeenNthCalledWith(1, 'left');
        expect(handlers.onNudge).toHaveBeenNthCalledWith(2, 'down');
        expect(handlers.onZoomStep).toHaveBeenNthCalledWith(1, 1);
        expect(handlers.onZoomStep).toHaveBeenNthCalledWith(2, -1);
    });

    it('pans by the distance dragged, in mm', () => {
        const handlers = gestures();

        render(
            <ElementStage widthMm={63} heightMm={88} gestures={handlers}>
                <p>kaart</p>
            </ElementStage>,
        );
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

        render(
            <ElementStage widthMm={63} heightMm={88} gestures={handlers}>
                <p>kaart</p>
            </ElementStage>,
        );
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
