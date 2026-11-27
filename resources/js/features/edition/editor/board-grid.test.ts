import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { sampleEdition } from '@/testing/editions';

import {
    bandStyle,
    canSwapKeys,
    firstSwapTarget,
    gridCell,
    gridTemplate,
    groupColor,
    miniPhotoBox,
    nextSwapTarget,
    positionOf,
    walkKey,
} from './board-grid';

describe('gridCell', () => {
    it('puts Start bottom right and walks anticlockwise round the board', () => {
        expect(gridCell(0)).toEqual({ row: 10, col: 10 });
        expect(gridCell(10)).toEqual({ row: 10, col: 0 });
        expect(gridCell(20)).toEqual({ row: 0, col: 0 });
        expect(gridCell(30)).toEqual({ row: 0, col: 10 });
        expect(gridCell(39)).toEqual({ row: 9, col: 10 });
    });
});

describe('gridTemplate', () => {
    it('gives corners and spaces the sizes of the board profile, also for another board size', () => {
        expect(gridTemplate(DEFAULT_BOARD_PROFILE)).toBe(
            '70fr repeat(9, 40fr) 70fr',
        );
        expect(
            gridTemplate({ ...DEFAULT_BOARD_PROFILE, outer: 400, corner: 50 }),
        ).toBe('50fr repeat(9, 33.333333333333336fr) 50fr');
    });
});

describe('the cells of the board', () => {
    it('reads the position of a space key and only swaps spaces of the same kind', () => {
        expect(positionOf('space.07')).toBe(7);
        expect(positionOf('board_center')).toBeNull();
        expect(canSwapKeys('space.01', 'space.03')).toBe(true);
        expect(canSwapKeys('space.01', 'space.05')).toBe(false);
        expect(canSwapKeys('space.01', 'board_center')).toBe(false);
    });

    it('colours a street with its group, on the inner edge of its side', () => {
        expect(groupColor(1, sampleEdition())).toMatch(/^#/);
        expect(groupColor(0, sampleEdition())).toBeNull();
        expect(bandStyle(1, 'red')).toBe(
            'linear-gradient(to bottom, red 20%, transparent 20%)',
        );
        expect(bandStyle(11, 'red')).toContain('to left');
        expect(bandStyle(21, 'red')).toContain('to top');
        expect(bandStyle(31, 'red')).toContain('to right');
    });

    it('keeps the photo of a space clear of its colour band', () => {
        expect(miniPhotoBox(0)).toEqual({
            left: '12%',
            top: '12%',
            width: '76%',
            height: '76%',
        });
        expect(miniPhotoBox(1).top).toBe('26%');
        expect(miniPhotoBox(11).width).toBe('66%');
        expect(miniPhotoBox(21).height).toBe('66%');
        expect(miniPhotoBox(31).left).toBe('26%');
    });
});

describe('walking and swapping', () => {
    it('walks in game order and steps over spaces that cannot be chosen', () => {
        expect(walkKey('space.01', true, undefined)).toBe('space.02');
        expect(walkKey('space.02', false, undefined)).toBe('space.01');
        expect(walkKey('space.01', true, (key) => key !== 'space.02')).toBe(
            'space.03',
        );
        expect(walkKey('space.01', true, () => false)).toBeDefined();
    });

    it('offers the next space of the same kind to swap with, and walks round them', () => {
        expect(firstSwapTarget('space.01')).toBe('space.03');
        expect(firstSwapTarget('board_center')).toBeUndefined();
        expect(nextSwapTarget('space.01', 'space.03', true)).not.toBe(
            'space.03',
        );
        expect(
            nextSwapTarget(
                'space.01',
                nextSwapTarget('space.01', 'space.03', true) ?? '',
                false,
            ),
        ).toBe('space.03');
    });
});
