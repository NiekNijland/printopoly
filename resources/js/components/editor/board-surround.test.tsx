import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { resolveEdition } from '@/lib/edition/resolve';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { sampleEdition } from '@/testing/editions';

import { BoardSurround, placeOnBoard } from './board-surround';

describe('placeOnBoard', () => {
    it('turns a space so it stands upright, as on the stage', () => {
        expect(placeOnBoard('space.01', DEFAULT_BOARD_PROFILE)?.rotation).toBe(
            0,
        );
        expect(placeOnBoard('space.11', DEFAULT_BOARD_PROFILE)?.rotation).toBe(
            90,
        );
        expect(placeOnBoard('space.21', DEFAULT_BOARD_PROFILE)?.rotation).toBe(
            180,
        );
        expect(placeOnBoard('space.31', DEFAULT_BOARD_PROFILE)?.rotation).toBe(
            270,
        );
    });

    it('centres on the middle of the board for the centre, and skips other parts', () => {
        expect(placeOnBoard('board_center', DEFAULT_BOARD_PROFILE)).toEqual({
            x: 250,
            y: 250,
            rotation: 0,
        });
        expect(placeOnBoard('card.chance.1', DEFAULT_BOARD_PROFILE)).toBeNull();
    });
});

describe('BoardSurround', () => {
    it('opens a neighbour on a click, and has no hit area for the shown space', () => {
        const onPick = vi.fn();
        const resolved = resolveEdition(sampleEdition());
        const { container } = render(
            <BoardSurround
                resolved={resolved}
                photos={new Map()}
                selected="space.01"
                pxPerMm={2}
                onPick={onPick}
            />,
        );

        expect(
            container.querySelector('[data-surround-key="space.01"]'),
        ).toBeNull();
        const neighbour = container.querySelector(
            '[data-surround-key="space.02"]',
        );
        expect(neighbour).not.toBeNull();
        fireEvent.click(neighbour as Element);
        expect(onPick).toHaveBeenCalledWith('space.02');
    });
});
