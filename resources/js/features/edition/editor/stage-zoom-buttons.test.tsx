import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithI18n } from '@/testing/render';

import { StageZoomButtons } from './stage-zoom-buttons';

describe('StageZoomButtons', () => {
    it('zooms out, fits and zooms in, and shows the zoom when it is not fit', async () => {
        const user = userEvent.setup();
        const onStep = vi.fn();
        const onFit = vi.fn();
        renderWithI18n(
            <StageZoomButtons zoom={1.4} onStep={onStep} onFit={onFit} />,
        );
        const [out, fit, zoomIn] = screen.getAllByRole('button');

        expect(fit).toHaveTextContent('140%');

        await user.click(out ?? document.body);
        await user.click(fit ?? document.body);
        await user.click(zoomIn ?? document.body);

        expect(onStep).toHaveBeenNthCalledWith(1, -1);
        expect(onStep).toHaveBeenNthCalledWith(2, 1);
        expect(onFit).toHaveBeenCalledTimes(1);
    });

    it('stops at the limits and shows the fit icon at fit', () => {
        const { rerender } = renderWithI18n(
            <StageZoomButtons zoom={0.6} onStep={vi.fn()} onFit={vi.fn()} />,
        );

        expect(screen.getAllByRole('button')[0]).toBeDisabled();

        rerender(
            <StageZoomButtons zoom={5} onStep={vi.fn()} onFit={vi.fn()} />,
        );

        expect(screen.getAllByRole('button')[2]).toBeDisabled();

        rerender(
            <StageZoomButtons zoom={1} onStep={vi.fn()} onFit={vi.fn()} />,
        );

        expect(screen.getAllByRole('button')[1]).not.toHaveTextContent('%');
    });
});
