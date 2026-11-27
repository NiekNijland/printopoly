import { describe, expect, it } from 'vitest';
import { centerSquares } from '@/lib/render/center-layout';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { FreeLayer } from '@/lib/render/edition-types';
import { centerRect, DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { makeEdition } from '@/testing/edition-test-utils';

import { layerOnFold } from './editor-layer-fold';
import {
    newCenterLayerSpot,
    placeNewCenterLayer,
} from './editor-layer-placement';

const profile = DEFAULT_BOARD_PROFILE;

describe('editor-layer-placement', () => {
    it('starts a new layer in the free square the title does not use', () => {
        const squares = centerSquares(profile);

        expect(newCenterLayerSpot(profile, 'topRight')).toEqual(
            squares.bottomLeft,
        );
        expect(newCenterLayerSpot(profile, 'bottomLeft')).toEqual(
            squares.topRight,
        );
    });

    it('puts a new layer clear of the folds, inside the centre, and not on the one before it', () => {
        const edition = makeEdition();
        const centre = resolveEdition(edition).boardCenter;
        const area = centerRect(profile);
        const layer: FreeLayer = {
            id: 'a',
            kind: 'text',
            text: 'x',
            x: area.w / 2 - 20,
            y: area.h / 2 - 20,
            w: 40,
            h: 40,
        };
        const first = placeNewCenterLayer(layer, edition, centre, []);
        const second = placeNewCenterLayer(
            { ...layer, id: 'b' },
            edition,
            centre,
            [first],
        );

        for (const placed of [first, second]) {
            expect(layerOnFold(placed, profile)).toBe(false);
            expect(placed.x).toBeGreaterThanOrEqual(0);
            expect(placed.x + placed.w).toBeLessThanOrEqual(area.w);
        }
        expect([second.x, second.y]).not.toEqual([first.x, first.y]);
    });

    it('leaves the layer where it was when nothing is free', () => {
        const edition = makeEdition();
        const centre = resolveEdition(edition).boardCenter;
        const area = centerRect(profile);
        const huge: FreeLayer = {
            id: 'big',
            kind: 'text',
            text: 'x',
            x: 0,
            y: 0,
            w: area.w,
            h: area.h,
        };

        expect(placeNewCenterLayer(huge, edition, centre, [huge])).toBe(huge);
    });
});
