import { describe, expect, it } from 'vitest';

import type { FreeLayer } from '@/lib/edition/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';

import {
    centerZones,
    clampLayer,
    moveLayer,
    newPhotoLayer,
    newTextLayer,
    rotateLayer,
    scaleLayer,
} from './layers';

const area = { w: 360, h: 360 };
const text: FreeLayer = {
    id: 'layer-1',
    kind: 'text',
    text: 'Hallo',
    x: 100,
    y: 100,
    w: 100,
    h: 30,
};

describe('free layers', () => {
    it('adds a text layer in the middle with a fresh id', () => {
        const layer = newTextLayer([text], area, 'Nieuw');
        expect(layer.id).toBe('layer-2');
        expect(layer.x + layer.w / 2).toBe(180);
        expect(layer.y + layer.h / 2).toBe(180);
    });

    it('adds a photo layer that is square', () => {
        const layer = newPhotoLayer([], area, {
            photoId: 'p',
            cx: 0.5,
            cy: 0.5,
            scale: 1,
            rotation: 0,
            grayscale: false,
        });
        expect(layer.w).toBe(layer.h);
        expect(layer.kind).toBe('photo');
    });

    it('moves a layer and keeps its middle inside the area', () => {
        expect(moveLayer(text, 10, -5, area)).toMatchObject({ x: 110, y: 95 });
        const far = moveLayer(text, 9999, 9999, area);
        expect(far.x + far.w / 2).toBe(360);
        expect(far.y + far.h / 2).toBe(360);
    });

    it('scales around the middle and never below the minimum', () => {
        const bigger = scaleLayer(text, 2, area);
        expect(bigger.w).toBe(200);
        expect(bigger.x + bigger.w / 2).toBe(150);
        expect(scaleLayer(text, 0.001, area).w).toBe(6);
    });

    it('clamps a layer larger than the area', () => {
        expect(clampLayer({ ...text, w: 900, h: 900 }, area)).toMatchObject({
            w: 360,
            h: 360,
        });
    });

    it('rotates in whole degrees and drops a zero rotation', () => {
        expect(rotateLayer(text, 45.4)).toMatchObject({ rotation: 45 });
        expect(rotateLayer(text, 270)).toMatchObject({ rotation: -90 });
        expect('rotation' in rotateLayer({ ...text, rotation: 30 }, 0)).toBe(
            false,
        );
    });

    it('marks two fold lines and two card spots on a four panel board', () => {
        const zones = centerZones(DEFAULT_BOARD_PROFILE);
        expect(zones.filter((zone) => zone.kind === 'fold')).toHaveLength(2);
        expect(zones.filter((zone) => zone.kind === 'spot')).toHaveLength(2);
        const twoPanels = centerZones({ ...DEFAULT_BOARD_PROFILE, panels: 2 });
        expect(twoPanels.filter((zone) => zone.kind === 'fold')).toHaveLength(
            1,
        );
    });
});
