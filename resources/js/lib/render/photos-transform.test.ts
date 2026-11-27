import { describe, expect, it } from 'vitest';
import { coverTransform } from '@/testing/photo-transform';
import {
    MAX_ZOOM,
    MIN_ZOOM,
    NUDGE_MM,
    clampTransform,
    containMmPerPx,
    coverMmPerPx,
    coversTarget,
    defaultTransform,
    mmPerPx,
    nudge,
    orientedSize,
    panBy,
    rotateQuarter,
    setZoom,
    visibleRegion,
    zoomBy,
} from './photos-transform';

const source = { w: 4000, h: 3000 };
const target = { w: 60, h: 40 };

describe('cover and contain', () => {
    it('cover fills the target, contain fits inside it', () => {
        expect(coverMmPerPx(source, 0, target)).toBe(
            Math.max(60 / 4000, 40 / 3000),
        );
        expect(containMmPerPx(source, 0, target)).toBe(
            Math.min(60 / 4000, 40 / 3000),
        );
    });

    it('swaps width and height for quarter turns', () => {
        expect(orientedSize(source, 90)).toEqual({ w: 3000, h: 4000 });
        expect(orientedSize(source, 180)).toEqual(source);
        expect(coverMmPerPx(source, 90, target)).toBeCloseTo(
            Math.max(60 / 3000, 40 / 4000),
            12,
        );
    });
});

describe('coverTransform and clamping', () => {
    it('starts centred at 100% and covers the target', () => {
        const t = coverTransform(source, target);
        expect(t).toEqual({
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
            grayscale: false,
        });
        expect(coversTarget(source, t, target)).toBe(true);
    });

    it('cannot pan at 100% along the axis that is exactly covered', () => {
        // 4000x3000 into 60x40: 60/4000=0.015 > 40/3000, so the width is covered exactly; only y can move.
        const t = panBy(source, coverTransform(source, target), target, 10, 0);
        expect(t.x).toBe(0.5);
        const moved = panBy(
            source,
            coverTransform(source, target),
            target,
            0,
            5,
        );
        expect(moved.y).toBeLessThan(0.5);
    });

    it('clamps pan so the photo always covers the target', () => {
        let t = setZoom(source, coverTransform(source, target), target, 2);
        t = panBy(source, t, target, -10_000, -10_000);
        expect(coversTarget(source, t, target)).toBe(true);
        const r = visibleRegion(source, t, target);
        expect(r.x).toBeCloseTo(4000 - r.w, 6);
        expect(r.y).toBeCloseTo(3000 - r.h, 6);
        t = panBy(source, t, target, 10_000, 10_000);
        const r2 = visibleRegion(source, t, target);
        expect(r2.x).toBeCloseTo(0, 6);
        expect(r2.y).toBeCloseTo(0, 6);
    });

    it('limits zoom to 100 to 300%', () => {
        const t = coverTransform(source, target);
        expect(setZoom(source, t, target, 0.2).scale).toBe(MIN_ZOOM);
        expect(setZoom(source, t, target, 9).scale).toBe(MAX_ZOOM);
        expect(
            clampTransform(source, { ...t, scale: Number.NaN }, target).scale,
        ).toBe(MIN_ZOOM);
    });

    it('repairs a stored transform that would leave a gap', () => {
        const bad = { ...defaultTransform(), scale: 1.5, x: 0, y: 1 };
        const fixed = clampTransform(source, bad, target);
        expect(coversTarget(source, fixed, target)).toBe(true);
    });

    it('detects a photo that does not cover (zoom below 100%)', () => {
        expect(
            coversTarget(source, { ...defaultTransform(), scale: 0.8 }, target),
        ).toBe(false);
    });
});

describe('zoom', () => {
    it('zoomBy steps by 10% and stays in range', () => {
        let t = coverTransform(source, target);
        t = zoomBy(source, t, target, 0.1);
        expect(t.scale).toBeCloseTo(1.1, 9);
        t = zoomBy(source, t, target, -0.5);
        expect(t.scale).toBe(1);
    });

    it('zooming in halves the visible region', () => {
        const t1 = coverTransform(source, target);
        const t2 = setZoom(source, t1, target, 2);
        expect(visibleRegion(source, t2, target).w).toBeCloseTo(
            visibleRegion(source, t1, target).w / 2,
            6,
        );
    });
});

describe('nudge', () => {
    it('moves the photo 0.5 mm per press in the arrow direction', () => {
        const t0 = setZoom(source, coverTransform(source, target), target, 2);
        const k = mmPerPx(source, t0, target);
        const right = nudge(source, t0, target, 'right');
        // The picture moves right, so the visible window moves left by 0.5 mm worth of pixels.
        expect((t0.x - right.x) * 4000 * k).toBeCloseTo(NUDGE_MM, 9);
        const down = nudge(source, t0, target, 'down');
        expect((t0.y - down.y) * 3000 * k).toBeCloseTo(NUDGE_MM, 9);
        const left = nudge(source, t0, target, 'left');
        expect(left.x).toBeGreaterThan(t0.x);
        const up = nudge(source, t0, target, 'up');
        expect(up.y).toBeGreaterThan(t0.y);
    });

    it('stops at the edge instead of exposing a gap', () => {
        let t = setZoom(source, coverTransform(source, target), target, 1.2);
        for (let i = 0; i < 500; i++) t = nudge(source, t, target, 'right');
        expect(coversTarget(source, t, target)).toBe(true);
    });
});

describe('rotateQuarter', () => {
    it('turns clockwise through 90, 180, 270 and back to 0', () => {
        let t = coverTransform(source, target);
        const seen: number[] = [];
        for (let i = 0; i < 4; i++) {
            t = rotateQuarter(source, t, target, 1);
            seen.push(t.rotation);
        }
        expect(seen).toEqual([90, 180, 270, 0]);
    });

    it('turns anticlockwise', () => {
        const t = rotateQuarter(
            source,
            coverTransform(source, target),
            target,
            -1,
        );
        expect(t.rotation).toBe(270);
    });

    it('keeps covering after a turn on a non-square photo', () => {
        const t = rotateQuarter(
            source,
            setZoom(source, coverTransform(source, target), target, 2.5),
            target,
            1,
        );
        expect(coversTarget(source, t, target)).toBe(true);
    });

    it('moves the centre point with the picture (square photo, zoomed, off-centre)', () => {
        const sq = { w: 1000, h: 1000 };
        const box = { w: 50, h: 50 };
        const t0 = {
            ...setZoom(sq, coverTransform(sq, box), box, 2),
            x: 0.7,
            y: 0.4,
        };
        const t1 = rotateQuarter(sq, t0, box, 1);
        expect(t1.x).toBeCloseTo(0.6, 9);
        expect(t1.y).toBeCloseTo(0.7, 9);
        let t = t0;
        for (let i = 0; i < 4; i++) t = rotateQuarter(sq, t, box, 1);
        expect(t.x).toBeCloseTo(0.7, 9);
        expect(t.y).toBeCloseTo(0.4, 9);
    });

    it('keeps the grayscale flag', () => {
        const t = rotateQuarter(
            source,
            coverTransform(source, target, 0, true),
            target,
            1,
        );
        expect(t.grayscale).toBe(true);
    });
});
