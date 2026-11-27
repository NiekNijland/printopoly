import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/testing/editions';

import { BoardSurround } from './board-surround';

const placeOf = (selected: string) =>
    render(
        <BoardSurround
            resolved={resolveEdition(sampleEdition())}
            photos={new Map()}
            selected={selected}
            pxPerMm={96 / 25.4}
            onPick={vi.fn<(key: string) => void>()}
        />,
    ).container.querySelector<HTMLElement>('[data-board-surround] > div > div')
        ?.style.transform;

describe('the place of the shown part on the board', () => {
    it('turns a space so it stands upright, as on the stage', () => {
        expect(placeOf('space.01')).toContain('rotate(0deg)');
        expect(placeOf('space.11')).toContain('rotate(-90deg)');
        expect(placeOf('space.21')).toContain('rotate(-180deg)');
        expect(placeOf('space.31')).toContain('rotate(-270deg)');
    });

    it('centres on the middle of the board for the centre, and skips other parts', () => {
        expect(placeOf('board_center')).toBe(
            'scale(1) rotate(0deg) translate(-250mm, -250mm)',
        );
        expect(placeOf('card.chance.1')).toBeUndefined();
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
        if (neighbour === null) {
            throw new Error('The space next to it is not drawn.');
        }
        fireEvent.click(neighbour);
        expect(onPick).toHaveBeenCalledWith('space.02');
    });
});
