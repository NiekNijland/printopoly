import { describe, expect, it } from 'vitest';

import {
    bumpyCircle,
    cornerBlocks,
    cutCornerBox,
    ellipsePath,
    latheRosette,
    notchedBanner,
    ropeBand,
    waveNet,
} from './banknote-guilloche';

const count = (path: string, command: string): number =>
    path.split(command).length - 1;

const coordinates = (path: string): [number, number][] =>
    path
        .split(/[MLZ]/)
        .filter((pair) => pair !== '')
        .map((pair): [number, number] => {
            const [x = '', y = ''] = pair.split(' ');

            return [Number(x), Number(y)];
        });

describe('latheRosette', () => {
    const rosette = {
        cx: 50,
        cy: 30,
        inner: 4,
        outer: 10,
        rings: 3,
        lobes: 12,
        amp: 0.5,
        twist: 0.3,
    };

    it('draws one closed ring per ring, sampled round the circle', () => {
        const path = latheRosette(rosette);

        expect(count(path, 'Z')).toBe(3);
        expect(count(path, 'M')).toBe(3);
        expect(count(path, 'L')).toBe(3 * (12 * 8 - 1));
    });

    it('keeps the rings between the inner and outer radius, plus the waves', () => {
        const radii = coordinates(latheRosette(rosette)).map(([x, y]) =>
            Math.hypot(x - 50, y - 30),
        );

        expect(Math.min(...radii)).toBeGreaterThanOrEqual(3.49);
        expect(Math.max(...radii)).toBeLessThanOrEqual(10.51);
    });

    it('uses at least 48 samples and the inner radius for a single ring', () => {
        const path = latheRosette({
            ...rosette,
            rings: 1,
            lobes: 2,
            amp: 0,
        });
        const radii = coordinates(path).map(([x, y]) =>
            Math.hypot(x - 50, y - 30),
        );

        expect(count(path, 'L')).toBe(47);
        expect(Math.max(...radii)).toBeCloseTo(4, 1);
    });

    it('stretches the rings along x', () => {
        const xs = coordinates(
            latheRosette({ ...rosette, rings: 1, amp: 0, stretch: 2 }),
        ).map(([x]) => x);

        expect(Math.max(...xs)).toBeCloseTo(58, 1);
    });
});

describe('waveNet', () => {
    const field = { x: 0, y: 0, w: 10, h: 4 };
    const wave = { gap: 2, amp: 1, period: 9 };

    it('draws two families of waves, one line per row', () => {
        expect(count(waveNet(field, wave), 'M')).toBe(8);
    });

    it('stops the waves where a shape covers them', () => {
        const path = waveNet(field, wave, (x) => x >= 4 && x <= 6);

        expect(count(path, 'M')).toBe(16);
        expect(coordinates(path).some(([x]) => x >= 4 && x <= 6)).toBe(false);
    });

    it('draws nothing when everything is covered', () => {
        expect(waveNet(field, wave, () => true)).toBe('');
    });
});

describe('ropeBand', () => {
    it('winds the strands along the four sides, clear of the corners', () => {
        const path = ropeBand(
            { x: 0, y: 0, w: 40, h: 20 },
            { amp: 0.5, period: 4, strands: 3, corner: 2 },
        );

        expect(count(path, 'M')).toBe(12);
        expect(path.startsWith('M2 0L')).toBe(true);
    });
});

describe('cornerBlocks', () => {
    it('puts a square with a rosette on each corner', () => {
        const path = cornerBlocks({ x: 0, y: 0, w: 20, h: 10 }, 2);

        expect(count(path, 'h2v2h-2Z')).toBe(4);
        expect(path.startsWith('M-1 -1h2v2h-2Z')).toBe(true);
        expect(path).toContain('M19 9h2v2h-2Z');
    });
});

describe('cutCornerBox', () => {
    it('cuts the four corners at 45 degrees', () => {
        expect(cutCornerBox({ x: 0, y: 0, w: 10, h: 6 }, 1)).toBe(
            'M1 0H9L10 1V5L9 6H1L0 5V1Z',
        );
    });
});

describe('notchedBanner', () => {
    it('folds the short sides in to a point', () => {
        expect(notchedBanner({ x: 0, y: 0, w: 10, h: 4 }, 1)).toBe(
            'M0 0H10L9 2L10 4H0L1 2Z',
        );
    });
});

describe('ellipsePath', () => {
    it('draws the ellipse as four cubic curves', () => {
        expect(ellipsePath(0, 0, 2, 1)).toBe(
            'M2 0C2 0.55 1.1 1 0 1C-1.1 1 -2 0.55 -2 0C-2 -0.55 -1.1 -1 0 -1C1.1 -1 2 -0.55 2 0Z',
        );
    });
});

describe('bumpyCircle', () => {
    it('draws one curve per bump through a point beyond the circle', () => {
        const path = bumpyCircle(0, 0, 1, 4, 0.5);

        expect(count(path, 'Q')).toBe(4);
        expect(path.startsWith('M1 0Q1.41 1.41 0 1Q')).toBe(true);
        expect(path.endsWith('Z')).toBe(true);
    });
});
