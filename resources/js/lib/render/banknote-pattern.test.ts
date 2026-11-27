import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    cached,
    hatch,
    noteIcons,
    noteInk,
    notePaperLight,
    rasterPattern,
    ringField,
    rosette,
    scallopBand,
    type PatternRaster,
} from './banknote-pattern';

const count = (path: string, command: string): number =>
    path.split(command).length - 1;

const points = (path: string): [number, number][] =>
    path
        .replace(/[MZ]/g, '')
        .split('L')
        .map((pair): [number, number] => {
            const [x = '', y = ''] = pair.split(' ');

            return [Number(x), Number(y)];
        });

describe('noteInk', () => {
    it('gives a dark shade of the paper hue', () => {
        expect(noteInk('#F5EBCB', '#000000')).toBe('#4F4421');
        expect(noteInk('#D3E4F5', '#000000')).toBe('#23384D');
        expect(noteInk('#ED1B24', '#000000')).toBe('#551B1E');
        expect(noteInk('#00FF00', '#000000')).toBe('#195719');
        expect(noteInk('#0000ff', '#000000')).toBe('#191957');
    });

    it('gives grey paper a neutral ink', () => {
        expect(noteInk('#808080', '#000000')).toBe('#2E2E2E');
    });

    it('falls back for a value that is not #RRGGBB', () => {
        expect(noteInk('teal', '#123456')).toBe('#123456');
        expect(noteInk('#abc', '#123456')).toBe('#123456');
    });
});

describe('notePaperLight', () => {
    it('lightens the paper in its own hue', () => {
        expect(notePaperLight('#F5EBCB', '#FFFFFF')).toBe('#FBF6E8');
        expect(notePaperLight('#808080', '#FFFFFF')).toBe('#C6C6C6');
        expect(notePaperLight('#ED1B24', '#FFFFFF')).toBe('#F7989C');
    });

    it('falls back for a value that is not #RRGGBB', () => {
        expect(notePaperLight('', '#FFFFFF')).toBe('#FFFFFF');
    });
});

describe('ringField', () => {
    const field = { x: 0, y: 0, w: 10, h: 10 };

    it('draws groups of rings on a staggered grid', () => {
        const light = ringField(field, 'light');

        expect(count(light, 'M')).toBe(28);
        expect(count(light, 'C')).toBe(28 * 4);
        expect(count(ringField(field, 'full'), 'M')).toBeGreaterThan(28);
    });

    it('leaves out rings under the oval', () => {
        expect(
            count(
                ringField(field, 'light', {
                    ellipse: { cx: 0, cy: 0, rx: 5, ry: 5 },
                }),
                'M',
            ),
        ).toBe(25);
    });

    it('leaves out everything under a covering strip', () => {
        expect(
            ringField(field, 'light', {
                rects: [{ x: -100, y: -100, w: 300, h: 300 }],
            }),
        ).toBe('');
    });
});

describe('rosette', () => {
    it('draws one closed loop that reaches the ellipse', () => {
        const path = rosette(50, 30, 20, 10, 0, 6);
        const reach = Math.max(
            ...points(path).map(([x, y]) =>
                Math.hypot((x - 50) / 20, (y - 30) / 10),
            ),
        );

        expect(path.startsWith('M')).toBe(true);
        expect(path.endsWith('Z')).toBe(true);
        expect(count(path, 'L')).toBe(6 * 16);
        expect(reach).toBeCloseTo(1, 2);
    });

    it('turns the loops with the phase', () => {
        expect(rosette(0, 0, 10, 10, 0.5)).not.toBe(rosette(0, 0, 10, 10));
    });
});

describe('scallopBand', () => {
    it('draws half circles all round the band', () => {
        expect(scallopBand({ x: 0, y: 0, w: 4, h: 2 }, 1)).toBe(
            'M0 0A1 1 0 0 1 2 0M2 0A1 1 0 0 1 4 0' +
                'M4 0A1 1 0 0 1 4 2' +
                'M4 2A1 1 0 0 1 2 2M2 2A1 1 0 0 1 0 2' +
                'M0 2A1 1 0 0 1 0 0',
        );
    });
});

describe('hatch', () => {
    it('draws diagonal lines across the rectangle', () => {
        expect(hatch({ x: 0, y: 0, w: 4, h: 2 }, 2)).toBe('M2 0L0 2M4 0L2 2');
        expect(hatch({ x: 10, y: 5, w: 2, h: 2 }, 1)).toBe(
            'M11 5L10 6M12 5L10 7M12 6L11 7',
        );
    });
});

describe('cached', () => {
    it('builds the line work of a key once', () => {
        const build = vi.fn<() => string>().mockReturnValue('M0 0');

        expect(cached('test-cached-key', build)).toBe('M0 0');
        expect(cached('test-cached-key', build)).toBe('M0 0');
        expect(build).toHaveBeenCalledOnce();
    });
});

describe('noteIcons', () => {
    it('gives each value its own pair of corner icons', () => {
        expect(noteIcons(1)).toEqual(['house', 'key']);
        expect(noteIcons(5)).toEqual(['hotel', 'die']);
        expect(noteIcons(10)).toEqual(['key', 'house']);
        expect(noteIcons(20)).toEqual(['die', 'hotel']);
        expect(noteIcons(50)).toEqual(['house', 'key']);
    });

    it('treats an unknown value as the first', () => {
        expect(noteIcons(7)).toEqual(['house', 'key']);
    });
});

describe('rasterPattern', () => {
    const raster: PatternRaster = {
        w: 10,
        h: 5,
        clipped: [{ d: 'M0 0L10 5', color: '#000000' }],
        clip: { x: 0, y: 0, w: 10, h: 5 },
        free: [],
        lineMm: 0.1,
        background: '#FFFFFF',
        density: 4,
    };

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('keeps the vector lines where there is no Path2D', () => {
        vi.stubGlobal('Path2D', undefined);

        expect(rasterPattern('raster-no-path', raster)).toBeNull();
    });

    it('keeps the vector lines when the canvas has no context, and remembers it', () => {
        vi.stubGlobal('Path2D', vi.fn<() => void>());
        const getContext = vi
            .spyOn(HTMLCanvasElement.prototype, 'getContext')
            .mockReturnValue(null);

        expect(rasterPattern('raster-no-context', raster)).toBeNull();
        expect(rasterPattern('raster-no-context', raster)).toBeNull();
        expect(getContext).toHaveBeenCalledOnce();
    });

    it('keeps the vector lines when the canvas refuses a context', () => {
        vi.stubGlobal('Path2D', vi.fn<() => void>());
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
            () => {
                throw new Error('no canvas');
            },
        );

        expect(rasterPattern('raster-throws', raster)).toBeNull();
    });
});
