import { describe, expect, it } from 'vitest';
import { checkBoard, checkBoxLid } from './checks-board';
import { DEFAULT_BOARD_PROFILE } from './print-board';

describe('checkBoard', () => {
    it('accepts the default profile', () => {
        expect(checkBoard(DEFAULT_BOARD_PROFILE)).toEqual([]);
    });

    it('refuses a profile with nonsense numbers', () => {
        const [i] = checkBoard({ ...DEFAULT_BOARD_PROFILE, outer: 0 });
        expect(i).toMatchObject({
            code: 'board.profile-invalid',
            severity: 'error',
            icon: 'octagon-x',
        });
        expect(
            checkBoard(
                Object.assign(structuredClone(DEFAULT_BOARD_PROFILE), {
                    panels: 3,
                }),
            )[0]?.code,
        ).toBe('board.profile-invalid');
    });

    it('flags a board whose middle disappears', () => {
        expect(
            checkBoard({ ...DEFAULT_BOARD_PROFILE, corner: 260 }).map(
                (i) => i.code,
            ),
        ).toEqual(['board.center-missing']);
    });

    it('flags spaces under 15 mm', () => {
        const codes = checkBoard({ ...DEFAULT_BOARD_PROFILE, corner: 190 }).map(
            (i) => i.code,
        );
        expect(codes).toContain('board.spaces-too-narrow');
    });

    it('flags a home-print centre piece that does not fit A4 with bleed (B65)', () => {
        // Centre 500 - 2*70 = 360 -> pieces of 180 - 1 + 6 = 185 mm: fits 194 mm. Make the corners smaller.
        const [i] = checkBoard({ ...DEFAULT_BOARD_PROFILE, corner: 40 });
        expect(i?.code).toBe('board.home-print-too-big');
        expect(i?.message.nl).toContain('past niet op A4');
        expect(i?.message.en).toContain("doesn't fit on A4");
    });

    it('accepts the boundary: pieces of exactly 194 mm with bleed', () => {
        // piece = (outer - 2*corner)/2 - 1 + 6 = 194 -> outer - 2*corner = 378 with outer 500 -> corner 61
        expect(checkBoard({ ...DEFAULT_BOARD_PROFILE, corner: 61 })).toEqual(
            [],
        );
        expect(
            checkBoard({ ...DEFAULT_BOARD_PROFILE, corner: 60.5 }).map(
                (i) => i.code,
            ),
        ).toEqual(['board.home-print-too-big']);
    });
});

describe('checkBoxLid', () => {
    it('is fine for 267 x 267 and 300 x 300 (2 and 4 pieces of A4, R5-29)', () => {
        expect(checkBoxLid(DEFAULT_BOARD_PROFILE)).toEqual([]);
        expect(
            checkBoxLid({
                ...DEFAULT_BOARD_PROFILE,
                boxLid: { w: 300, h: 300 },
            }),
        ).toEqual([]);
    });

    it('warns when the lid takes more than 4 sheets of A4 at home', () => {
        const [i] = checkBoxLid({
            ...DEFAULT_BOARD_PROFILE,
            boxLid: { w: 400, h: 400 },
        });
        expect(i).toMatchObject({
            code: 'board.box-lid-too-big',
            severity: 'warning',
            elementKey: 'boxLid',
        });
        expect(i?.message.nl).toContain('6 vellen A4');
    });
});
