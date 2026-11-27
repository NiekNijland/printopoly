import { describe, expect, it } from 'vitest';
import { rectsOverlap } from '@/testing/rects';
import { at } from '../../types/print';
import {
    DEFAULT_BOARD_PROFILE,
    centerRect,
    foldLines,
    spaceRects,
    profileProblems,
    validateProfile,
    type BoardProfile,
} from './print-board';

const profiles: BoardProfile[] = [
    DEFAULT_BOARD_PROFILE,
    { ...DEFAULT_BOARD_PROFILE, outer: 508, corner: 72.5, border: 6 },
    { ...DEFAULT_BOARD_PROFILE, panels: 2 },
];

describe('spaceRects', () => {
    it.each(profiles)('gives 40 spaces with positions 0..39', (p) => {
        const rects = spaceRects(p);
        expect(rects).toHaveLength(40);
        expect(rects.map((r) => r.position)).toEqual([...Array(40).keys()]);
    });

    it.each(profiles)(
        'tiles each side exactly: widths sum to outer - 2 * border',
        (p) => {
            const rects = spaceRects(p);
            const bottom = rects.filter((r) => r.position <= 10);
            const left = rects.filter(
                (r) => r.position >= 10 && r.position <= 20,
            );
            expect(bottom.reduce((s, r) => s + r.w, 0) - 0).toBeCloseTo(
                p.outer - 2 * p.border + 0,
                6,
            );
            expect(left.reduce((s, r) => s + r.h, 0)).toBeCloseTo(
                p.outer - 2 * p.border,
                6,
            );
            const top = rects.filter(
                (r) => r.position >= 20 && r.position <= 30,
            );
            expect(top.reduce((s, r) => s + r.w, 0)).toBeCloseTo(
                p.outer - 2 * p.border,
                6,
            );
        },
    );

    it.each(profiles)(
        'has no overlaps, also not with the centre, and area adds up',
        (p) => {
            const rects = [
                ...spaceRects(p),
                { ...centerRect(p), position: -1 },
            ];
            for (let i = 0; i < rects.length; i++) {
                for (let j = i + 1; j < rects.length; j++) {
                    expect(
                        rectsOverlap(at(rects, i), at(rects, j)),
                        `${at(rects, i).position} vs ${at(rects, j).position}`,
                    ).toBe(false);
                }
            }
            const area = rects.reduce((s, r) => s + r.w * r.h, 0);
            expect(area).toBeCloseTo((p.outer - 2 * p.border) ** 2, 4);
        },
    );

    it('uses corner x corner for corners and corner depth for the rest', () => {
        const p = DEFAULT_BOARD_PROFILE;
        const rects = spaceRects(p);
        for (const pos of [0, 10, 20, 30]) {
            expect(rects[pos]).toMatchObject({ w: 70, h: 70, side: 'corner' });
        }
        expect(at(rects, 1).w).toBeCloseTo(40, 9);
        expect(at(rects, 1).h).toBe(70);
        expect(at(rects, 11).w).toBe(70);
        expect(at(rects, 11).h).toBeCloseTo(40, 9);
    });

    it('runs clockwise as on the classic board', () => {
        const r = spaceRects(DEFAULT_BOARD_PROFILE);
        // 0 bottom-right
        expect(at(r, 0).x + at(r, 0).w).toBe(500);
        expect(at(r, 0).y + at(r, 0).h).toBe(500);
        // bottom row right to left
        for (let i = 1; i <= 10; i++)
            expect(at(r, i).x).toBeLessThan(at(r, i - 1).x);
        expect(r[10]).toMatchObject({ x: 0, y: 430 });
        // left column bottom to top
        for (let i = 11; i <= 20; i++)
            expect(at(r, i).y).toBeLessThan(at(r, i - 1).y);
        expect(r[20]).toMatchObject({ x: 0, y: 0 });
        // top row left to right
        for (let i = 21; i <= 30; i++)
            expect(at(r, i).x).toBeGreaterThan(at(r, i - 1).x);
        expect(r[30]).toMatchObject({ x: 430, y: 0 });
        // right column top to bottom, ending just above position 0
        for (let i = 31; i <= 39; i++)
            expect(at(r, i).y).toBeGreaterThan(at(r, i - 1).y);
        expect(at(r, 39).y + at(r, 39).h).toBeCloseTo(at(r, 0).y, 9);
        expect([
            at(r, 1).side,
            at(r, 11).side,
            at(r, 21).side,
            at(r, 31).side,
        ]).toEqual(['bottom', 'left', 'top', 'right']);
        expect([
            at(r, 1).rotation,
            at(r, 11).rotation,
            at(r, 21).rotation,
            at(r, 31).rotation,
        ]).toEqual([0, 90, 180, 270]);
    });

    it('respects the border', () => {
        const p = { ...DEFAULT_BOARD_PROFILE, border: 5 };
        const rects = spaceRects(p);
        expect(Math.min(...rects.map((r) => r.x))).toBe(5);
        expect(Math.max(...rects.map((r) => r.x + r.w))).toBe(495);
        expect(centerRect(p)).toEqual({ x: 75, y: 75, w: 350, h: 350 });
    });
});

describe('foldLines', () => {
    it('has a vertical and a horizontal line for 4 panels, only vertical for 2', () => {
        expect(
            foldLines(DEFAULT_BOARD_PROFILE).map((l) => l.orientation),
        ).toEqual(['vertical', 'horizontal']);
        expect(foldLines({ ...DEFAULT_BOARD_PROFILE, panels: 2 })).toEqual([
            { orientation: 'vertical', x1: 250, y1: 0, x2: 250, y2: 500 },
        ]);
    });
});

describe('validateProfile', () => {
    it('accepts the default profile', () => {
        expect(validateProfile(DEFAULT_BOARD_PROFILE)).toEqual([]);
        expect(DEFAULT_BOARD_PROFILE.provisional).toBe(true);
    });

    it('catches corners that leave no room for 9 spaces, in Dutch', () => {
        const errors = validateProfile({
            ...DEFAULT_BOARD_PROFILE,
            outer: 508,
            corner: 200,
        });
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain(
            'Hoekvak plus 9 vakken past niet in 508 mm',
        );
    });

    it('words the same problems in English', () => {
        const errors = validateProfile(
            { ...DEFAULT_BOARD_PROFILE, outer: 508, corner: 200 },
            'en',
        );
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain(
            'A corner space plus 9 spaces does not fit in 508 mm',
        );
        expect(
            validateProfile({ ...DEFAULT_BOARD_PROFILE, border: 250 }, 'en')[0],
        ).toContain('border');
        expect(
            validateProfile(
                Object.assign(structuredClone(DEFAULT_BOARD_PROFILE), {
                    panels: 3,
                }),
                'en',
            ),
        ).toEqual(['The number of panels is 2 or 4.']);
    });

    it('writes a decimal point in English and says which field is wrong (Lukas, R5-19)', () => {
        const problems = profileProblems(
            { ...DEFAULT_BOARD_PROFILE, outer: 480, corner: 200, border: 4 },
            'en',
        );

        expect(problems.map((problem) => problem.field)).toEqual(['fit']);
        expect(problems[0]?.message).toContain(
            'two corners of 200 mm leave 8 mm',
        );
        expect(
            profileProblems(
                {
                    ...DEFAULT_BOARD_PROFILE,
                    outer: 508,
                    corner: 200,
                    border: 4.5,
                },
                'en',
            )[0]?.message,
        ).toContain('fit in 499 mm: two corners of 200 mm leave 11 mm');
        expect(
            profileProblems(
                {
                    ...DEFAULT_BOARD_PROFILE,
                    outer: 500,
                    corner: 200,
                    border: 0,
                },
                'en',
            )[0]?.message,
        ).toContain('leave 11.11 mm per space');
        expect(
            profileProblems(
                {
                    ...DEFAULT_BOARD_PROFILE,
                    outer: 500,
                    corner: 200,
                    border: 0,
                },
                'nl',
            )[0]?.message,
        ).toContain('11,11 mm per vak');
        expect(
            profileProblems({ ...DEFAULT_BOARD_PROFILE, border: -1 })[0]?.field,
        ).toBe('border');
    });

    it('catches a border that eats the board', () => {
        expect(
            validateProfile({ ...DEFAULT_BOARD_PROFILE, border: 250 })[0],
        ).toContain('rand');
    });

    it('catches non-positive and invalid values', () => {
        expect(
            validateProfile({ ...DEFAULT_BOARD_PROFILE, outer: 0 }),
        ).not.toEqual([]);
        expect(
            validateProfile({ ...DEFAULT_BOARD_PROFILE, corner: -1 }),
        ).not.toEqual([]);
        expect(
            validateProfile({ ...DEFAULT_BOARD_PROFILE, border: -1 }),
        ).not.toEqual([]);
        expect(
            validateProfile(
                Object.assign(structuredClone(DEFAULT_BOARD_PROFILE), {
                    panels: 3,
                }),
            ),
        ).not.toEqual([]);
        expect(
            validateProfile({
                ...DEFAULT_BOARD_PROFILE,
                boxLid: { w: 0, h: 10 },
            }),
        ).not.toEqual([]);
        expect(
            validateProfile({ ...DEFAULT_BOARD_PROFILE, outer: Number.NaN }),
        ).not.toEqual([]);
    });
});
