import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ElementStage } from './element-stage';
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

const wheel = (
    node: Element,
    init: { deltaX?: number; deltaY: number; ctrlKey?: boolean },
): void => {
    const event = createEvent.wheel(node);
    Object.defineProperties(event, {
        deltaX: { value: init.deltaX ?? 0 },
        deltaY: { value: init.deltaY },
        ctrlKey: { value: init.ctrlKey ?? false },
        metaKey: { value: false },
        clientX: { value: 0 },
        clientY: { value: 0 },
    });
    fireEvent(node, event);
};

describe('ElementStage', () => {
    it('zooms the view with the buttons and fits it again, and a new element starts at fit', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <ElementStage widthMm={500} heightMm={500} zoomable viewKey="a">
                <p>bord</p>
            </ElementStage>,
        );
        const stage = screen.getByTestId('element-stage');
        const [, fit = stage, zoomIn = stage] = [
            ...stage.querySelectorAll('[data-stage-zoom] button'),
        ];

        expect(stage).toHaveAttribute('data-zoom', '1');
        await user.click(zoomIn);
        expect(Number(stage.getAttribute('data-zoom'))).toBeCloseTo(1.4);
        await user.click(fit);
        expect(stage).toHaveAttribute('data-zoom', '1');

        await user.click(zoomIn);
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

    it('shows the drag hint on a photo until it is first moved, and remembers that', () => {
        window.localStorage.removeItem('printopoly.photo-drag-hint');
        const handlers = { ...gestures(), hint: 'Sleep om te verschuiven' };

        const { unmount } = render(
            <ElementStage widthMm={63} heightMm={88} gestures={handlers}>
                <p>kaart</p>
            </ElementStage>,
        );
        const frame = screen.getByRole('group');

        expect(screen.getByText('Sleep om te verschuiven')).toBeInTheDocument();

        fireEvent.pointerDown(frame, { pointerId: 1, clientX: 0, clientY: 0 });
        fireEvent.pointerMove(frame, { pointerId: 1, clientX: 10, clientY: 0 });

        expect(
            screen.queryByText('Sleep om te verschuiven'),
        ).not.toBeInTheDocument();
        unmount();
        render(
            <ElementStage widthMm={63} heightMm={88} gestures={handlers}>
                <p>kaart</p>
            </ElementStage>,
        );
        expect(
            screen.queryByText('Sleep om te verschuiven'),
        ).not.toBeInTheDocument();
        window.localStorage.removeItem('printopoly.photo-drag-hint');
    });

    it('zooms the view with Ctrl and the wheel and moves it with the wheel alone', () => {
        render(
            <ElementStage widthMm={500} heightMm={500} zoomable viewKey="a">
                <p>bord</p>
            </ElementStage>,
        );
        const stage = screen.getByTestId('element-stage');

        wheel(stage, { deltaY: -200 * Math.log(2), ctrlKey: true });

        expect(Number(stage.getAttribute('data-zoom'))).toBeCloseTo(2);

        wheel(stage, { deltaX: 10, deltaY: 20 });

        expect(stage.firstElementChild).toHaveStyle({
            transform: 'translate(-10px, -20px) scale(2)',
        });
    });

    it('moves the view by a drag next to the element and swallows the click that ends it', () => {
        const onClick = vi.fn();
        render(
            <ElementStage widthMm={500} heightMm={500} zoomable viewKey="a">
                <button type="button" onClick={onClick}>
                    vak
                </button>
            </ElementStage>,
        );
        const stage = screen.getByTestId('element-stage');
        const layer = stage.firstElementChild ?? stage;

        fireEvent.pointerDown(layer, {
            pointerId: 1,
            button: 0,
            clientX: 0,
            clientY: 0,
        });
        fireEvent.pointerMove(window, { pointerId: 1, clientX: 2, clientY: 0 });
        fireEvent.pointerMove(window, {
            pointerId: 1,
            clientX: 20,
            clientY: 10,
        });
        fireEvent.pointerMove(window, {
            pointerId: 1,
            clientX: 30,
            clientY: 10,
        });
        fireEvent.pointerUp(window, { pointerId: 1 });
        fireEvent.click(layer);

        expect(layer).toHaveStyle({
            transform: 'translate(28px, 10px) scale(1)',
        });
        fireEvent.click(screen.getByRole('button', { name: 'vak' }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('zooms the view around the middle of two fingers', () => {
        render(
            <ElementStage widthMm={500} heightMm={500} zoomable viewKey="a">
                <p>bord</p>
            </ElementStage>,
        );
        const stage = screen.getByTestId('element-stage');
        const layer = stage.firstElementChild ?? stage;

        fireEvent.pointerDown(layer, {
            pointerId: 1,
            button: 0,
            clientX: 0,
            clientY: 0,
        });
        fireEvent.pointerDown(layer, {
            pointerId: 2,
            button: 0,
            clientX: 100,
            clientY: 0,
        });
        fireEvent.pointerMove(window, {
            pointerId: 2,
            clientX: 100,
            clientY: 0,
        });
        fireEvent.pointerMove(window, {
            pointerId: 2,
            clientX: 200,
            clientY: 0,
        });

        expect(Number(stage.getAttribute('data-zoom'))).toBeGreaterThan(1);
    });

    it('zooms the photo with a trackpad pinch on the frame, not the view', () => {
        const handlers = gestures();

        render(
            <ElementStage
                widthMm={63}
                heightMm={88}
                gestures={handlers}
                zoomable
            >
                <p>kaart</p>
            </ElementStage>,
        );
        wheel(screen.getByRole('group'), { deltaY: -200, ctrlKey: true });
        wheel(screen.getByRole('group'), { deltaY: -200 });

        expect(handlers.onZoomFactor).toHaveBeenCalledTimes(1);
        expect(handlers.onZoomFactor).toHaveBeenCalledWith(Math.exp(1));
        expect(screen.getByTestId('element-stage')).toHaveAttribute(
            'data-zoom',
            '1',
        );
    });
});
