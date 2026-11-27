import { describe, expect, it } from 'vitest';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { FreeLayer } from '@/lib/render/edition-types';
import { centerRect, DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { makeEdition, photo } from '@/testing/edition-test-utils';
import { faceOnFold } from '@/testing/face-on-fold';

import { updateElement } from './edition-changes';
import type { Edition } from './edition-types';
import {
    boxOfLayer,
    centerFoldItems,
    faceOffFold,
    layerOffFold,
    layerOnFold,
    polygonsOverlap,
} from './editor-layer-fold';

const withOverride = (
    edition: Edition,
    key: string,
    patch: Parameters<typeof updateElement>[2],
): Edition => updateElement(edition, key, patch).edition;

const profile = DEFAULT_BOARD_PROFILE;
const centre = centerRect(profile);
const text = (x: number, y: number, w = 20, h = 10): FreeLayer => ({
    id: 'tekst',
    kind: 'text',
    text: 'x',
    x,
    y,
    w,
    h,
});

describe('editor-layer-fold', () => {
    it('turns a layer into a box around its middle', () => {
        expect(boxOfLayer({ ...text(10, 20, 30, 40), rotation: 15 })).toEqual({
            cx: 25,
            cy: 40,
            w: 30,
            h: 40,
            rotation: 15,
        });
    });

    it('sees two squares overlap, but not when they only touch', () => {
        const square = (x: number) => [
            { x, y: 0 },
            { x: x + 1, y: 0 },
            { x: x + 1, y: 1 },
            { x, y: 1 },
        ];

        expect(polygonsOverlap(square(0), square(0.5))).toBe(true);
        expect(polygonsOverlap(square(0), square(1))).toBe(false);
    });

    it('finds a layer on the fold cross, and moves it clear of it', () => {
        const onCross = text(centre.w / 2 - 10, centre.h / 4);

        expect(layerOnFold(onCross, profile)).toBe(true);
        expect(layerOnFold(layerOffFold(onCross, profile), profile)).toBe(
            false,
        );
    });

    it('lists a layer of the centre that lies on the fold for Controle', () => {
        const edition = withOverride(makeEdition(), 'board_center', {
            layers: [text(centre.w / 2 - 10, centre.h / 4)],
        });

        expect(
            centerFoldItems(edition, resolveEdition(edition).boardCenter),
        ).toEqual([{ field: 'layer.tekst', what: 'layer' }]);
    });

    it('moves the middle of a standing photo over the centre off the fold', () => {
        const size = { w: 3024, h: 4032 };
        const middle = { ...photo(), cx: 0.5, cy: 0.5, scale: 1 };

        expect(faceOnFold(profile, middle, size)).toBe(true);

        const moved = faceOffFold(profile, middle, size);

        expect(moved.scale).toBeGreaterThan(middle.scale);
        expect(faceOnFold(profile, moved, size)).toBe(false);
    });
});
