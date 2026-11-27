import { describe, expect, it } from 'vitest';

import { coversText, lidLayout, lidTextZones } from './box-lid-layout';

const lid = { w: 200, h: 300 };

describe('lidLayout with a photo over the whole lid', () => {
    it('covers the lid and stacks title, subtitle and lines in the block', () => {
        const layout = lidLayout(lid, {
            photo: 'full',
            subtitle: true,
            lines: true,
        });

        expect(layout.photo).toEqual({ x: 0, y: 0, w: 200, h: 300 });
        expect(layout.block?.y).toBeCloseTo(173.92, 6);
        expect(layout.block?.h).toBeCloseTo(112.08, 6);
        expect(layout.title.y).toBeCloseTo(177.92, 6);
        expect(layout.title.h).toBeCloseTo(52.08, 6);
        expect(layout.subtitle?.y).toBeCloseTo(231, 6);
        expect(layout.subtitle?.h).toBe(15);
        expect(layout.lines).toMatchObject({ x: 12, w: 176, h: 36 });
        expect(layout.lines?.y).toBeCloseTo(246, 6);
        expect(layout.picture).toBeUndefined();
        expect(layout.strip).toBeUndefined();
    });

    it('moves the title to the top or bottom with the offset, clamped', () => {
        const at = (offset: number) =>
            lidLayout(lid, {
                photo: 'full',
                offset,
                subtitle: false,
                lines: false,
            }).block?.y;

        expect(at(0)).toBeCloseTo(174, 6);
        expect(at(-1)).toBeCloseTo(14, 6);
        expect(at(-5)).toBeCloseTo(14, 6);
        expect(at(0.5)).toBeCloseTo(199.46, 6);
        expect(at(3)).toBeCloseTo(224.92, 6);
    });

    it('leaves out the subtitle and lines when there are none', () => {
        const layout = lidLayout(lid, {
            photo: 'full',
            subtitle: false,
            lines: false,
        });

        expect(layout.subtitle).toBeUndefined();
        expect(layout.lines).toBeUndefined();
    });
});

describe('lidLayout with a framed photo', () => {
    it('gives the photo less height when there are own lines', () => {
        const layout = lidLayout(lid, {
            photo: 'framed',
            subtitle: true,
            lines: true,
        });

        expect(layout.photo).toEqual({ x: 12, y: 12, w: 176, h: 138 });
        expect(layout.block).toBeUndefined();
        expect(layout.title).toEqual({ x: 12, y: 154, w: 176, h: 60 });
        expect(layout.subtitle?.y).toBe(216);
        expect(layout.subtitle?.h).toBeCloseTo(14.4, 6);
        expect(layout.lines?.y).toBeCloseTo(232.4, 6);
    });

    it('keeps the full photo height without lines', () => {
        const layout = lidLayout(lid, {
            photo: 'framed',
            subtitle: false,
            lines: false,
        });

        expect(layout.photo?.h).toBeCloseTo(174, 6);
        expect(layout.subtitle).toBeUndefined();
        expect(layout.lines).toBeUndefined();
    });
});

describe('lidLayout without an own photo', () => {
    it('puts the board picture in the middle and the strip at the bottom', () => {
        const layout = lidLayout(lid, {
            photo: 'none',
            subtitle: false,
            lines: false,
        });

        expect(layout.photo).toBeUndefined();
        expect(layout.title.y).toBeCloseTo(21, 6);
        expect(layout.picture?.w).toBeCloseTo(109.12, 6);
        expect(layout.picture?.x).toBeCloseTo(45.44, 6);
        expect(layout.picture?.y).toBeCloseTo(87, 6);
        expect(layout.strip?.y).toBeCloseTo(283.2, 6);
        expect(layout.strip?.h).toBeCloseTo(4.8, 6);
        expect(layout.subtitle).toBeUndefined();
    });

    it('shrinks the picture to leave room for the subtitle and lines', () => {
        const layout = lidLayout(
            { w: 200, h: 100 },
            { photo: 'logo', subtitle: true, lines: true },
        );

        expect(layout.picture?.h).toBeCloseTo(26, 6);
        expect(layout.subtitle?.y).toBeCloseTo(58, 6);
        expect(layout.lines?.y).toBeCloseTo(69, 6);
        expect(layout.lines?.h).toBeCloseTo(13, 6);
        expect(layout.strip?.h).toBe(3);
    });

    it('never makes the picture smaller than a fifth of the lid', () => {
        const layout = lidLayout(
            { w: 200, h: 60 },
            { photo: 'none', subtitle: true, lines: true },
        );

        expect(layout.picture?.h).toBeCloseTo(12, 6);
    });
});

describe('lidTextZones', () => {
    it('lists the title, subtitle and lines that are there', () => {
        const full = lidLayout(lid, {
            photo: 'framed',
            subtitle: true,
            lines: true,
        });
        const bare = lidLayout(lid, {
            photo: 'framed',
            subtitle: false,
            lines: false,
        });

        expect(lidTextZones(full)).toHaveLength(3);
        expect(lidTextZones(bare)).toEqual([bare.title]);
    });
});

describe('coversText', () => {
    const zones = [{ x: 0, y: 4, w: 10, h: 10 }];

    it('finds a layer over the text', () => {
        expect(coversText({ x: 2, y: 6, w: 4, h: 4 }, zones)).toBe(true);
    });

    it('ignores a layer beside the text or over it by only a sliver', () => {
        expect(coversText({ x: 20, y: 6, w: 4, h: 4 }, zones)).toBe(false);
        expect(coversText({ x: 9.5, y: 4, w: 4, h: 1.5 }, zones)).toBe(false);
    });

    it('measures a turned layer by its turned box', () => {
        expect(coversText({ x: 0, y: 0, w: 10, h: 2 }, zones)).toBe(false);
        expect(
            coversText({ x: 0, y: 0, w: 10, h: 2, rotation: 90 }, zones),
        ).toBe(true);
    });
});
