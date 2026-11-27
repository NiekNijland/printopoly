import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
    PlacementAction,
    PlacementContext,
} from '@/lib/render/editor-placements';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { PhotoFit, PhotoTurn, PhotoZoom } from './photo-adjust';

type Act = (action: PlacementAction, announcement?: string) => void;

const context: PlacementContext = {
    source: { w: 4000, h: 3000 },
    frame: { w: 40, h: 30 },
    bleed: 0,
};

describe('PhotoZoom', () => {
    it('zooms in and out in steps of ten and says the new size', async () => {
        const user = userEvent.setup();
        const onAct = vi.fn<Act>();

        renderWithI18n(
            <PhotoZoom
                placement={{ ...photo(), scale: 1.5 }}
                context={context}
                onAct={onAct}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Inzoomen' }));
        await user.click(screen.getByRole('button', { name: 'Uitzoomen' }));

        expect(onAct.mock.calls).toEqual([
            [{ type: 'zoom-by', delta: 0.1 }, 'Zoom 160%'],
            [{ type: 'zoom-by', delta: -0.1 }, 'Zoom 140%'],
        ]);
    });

    it('cannot zoom without a frame to measure', () => {
        renderWithI18n(
            <PhotoZoom
                placement={photo()}
                context={null}
                onAct={vi.fn<Act>()}
            />,
        );

        expect(screen.getByRole('button', { name: 'Inzoomen' })).toBeDisabled();
    });
});

describe('PhotoTurn', () => {
    it('turns the photo a quarter and makes it black and white', async () => {
        const user = userEvent.setup();
        const onAct = vi.fn<Act>();

        renderWithI18n(
            <PhotoTurn placement={photo()} context={context} onAct={onAct} />,
        );
        await user.click(
            screen.getByRole('button', { name: /Kwartslag draaien/ }),
        );
        await user.click(screen.getByRole('checkbox', { name: 'Zwart-wit' }));

        expect(onAct.mock.calls).toEqual([
            [{ type: 'rotate', turns: 1 }],
            [{ type: 'grayscale', on: true }],
        ]);
    });
});

describe('PhotoFit', () => {
    it('fits the whole photo and says so', async () => {
        const user = userEvent.setup();
        const onAct = vi.fn<Act>();

        renderWithI18n(
            <PhotoFit placement={photo()} context={context} onAct={onAct} />,
        );
        await user.click(
            screen.getByRole('radio', { name: 'Passend, hele foto' }),
        );

        expect(onAct).toHaveBeenCalledWith(
            { type: 'fit', on: true },
            expect.any(String),
        );
    });
});
