import { describe, expect, it } from 'vitest';

import { runChecks } from '@/lib/checks/checks';
import { resolveEdition } from '@/lib/edition/resolve';
import { makeEdition, photo } from '@/lib/edition/test-utils';
import type { Edition, ElementOverride, FreeLayer } from '@/lib/edition/types';
import { buildCheckInput } from '@/lib/editor/checks-input';
import {
    centerFoldItems,
    layerOffFold,
    layerOnFold,
    newCenterLayerSpot,
} from '@/lib/editor/layers';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';

import {
    centerLayout,
    centerSquares,
    crossesFold,
    type CenterLayoutOptions,
} from './center-layout';

const profile = DEFAULT_BOARD_PROFILE;

const options = (
    more: Partial<CenterLayoutOptions> = {},
): CenterLayoutOptions => ({
    mode: 'name',
    place: 'topRight',
    scale: 1,
    offset: 0,
    aspect: 4 / 3,
    logoTilt: false,
    frameInset: 2.4,
    ...more,
});

function withCentre(centre: ElementOverride): Edition {
    const edition = makeEdition();

    return {
        ...edition,
        elements: { ...edition.elements, board_center: centre },
    };
}

describe('the centre clear of the fold lines (B183, B187)', () => {
    it('puts the name, the photo and a straight logo in the free squares by default', () => {
        const name = centerLayout(profile, options());
        const photoLayout = centerLayout(profile, options({ mode: 'photo' }));
        const logo = centerLayout(profile, options({ mode: 'logo' }));

        expect(crossesFold(profile, name.title)).toBe(false);
        expect(photoLayout.photo).not.toBeNull();
        expect(crossesFold(profile, photoLayout.title)).toBe(false);
        expect(
            photoLayout.photo !== null &&
                crossesFold(profile, photoLayout.photo),
        ).toBe(false);
        // A logo is straight by default.
        expect(logo.logo?.rotation).toBe(0);
        expect(logo.logo !== null && crossesFold(profile, logo.logo)).toBe(
            false,
        );
    });

    it('puts the photo of "Naam met foto" in the square opposite the name', () => {
        const squares = centerSquares(profile);
        const topRight = centerLayout(profile, options({ mode: 'photo' }));
        const bottomLeft = centerLayout(
            profile,
            options({ mode: 'photo', place: 'bottomLeft' }),
        );

        expect(topRight.title.cx).toBe(squares.topRight.cx);
        expect(topRight.photo?.cx).toBe(squares.bottomLeft.cx);
        expect(bottomLeft.title.cy).toBe(squares.bottomLeft.cy);
        expect(bottomLeft.photo?.cy).toBe(squares.topRight.cy);
    });

    it('keeps the free squares clear of the card spots', () => {
        const squares = centerSquares(profile);

        for (const square of [squares.topRight, squares.bottomLeft]) {
            const layer: FreeLayer = {
                id: 'l',
                kind: 'text',
                text: 'x',
                x: square.cx - square.size / 2,
                y: square.cy - square.size / 2,
                w: square.size,
                h: square.size,
            };
            expect(layerOnFold(layer, profile)).toBe(false);
        }
    });

    it('lays the old ribbon across the cross only when asked', () => {
        const middle = centerLayout(profile, options({ place: 'middle' }));
        const tilted = centerLayout(
            profile,
            options({ mode: 'logo', place: 'middle', logoTilt: true }),
        );

        expect(crossesFold(profile, middle.title)).toBe(true);
        expect(tilted.logo?.rotation).toBe(-45);
    });

    it('says in Controle when the name, a photo or a logo lies on the fold, and only then', () => {
        const quiet = resolveEdition(withCentre({}));
        expect(centerFoldItems(withCentre({}), quiet.boardCenter)).toEqual([]);

        const middle = withCentre({ centerPlace: 'middle' });
        expect(
            centerFoldItems(middle, resolveEdition(middle).boardCenter),
        ).toEqual([{ field: 'center-place', what: 'name' }]);

        const face = withCentre({
            centerPlace: 'middle',
            centerMode: 'photo',
            photo: photo(),
        });
        expect(centerFoldItems(face, resolveEdition(face).boardCenter)).toEqual(
            [{ field: 'center-place', what: 'photo' }],
        );

        const logo = withCentre({
            centerPlace: 'middle',
            centerMode: 'logo',
            photo: photo(),
        });
        const issues = runChecks(buildCheckInput(logo, new Map(), new Map()));
        const fold = issues.find((item) => item.code === 'center.on-fold');
        expect(fold?.elementKey).toBe('board_center');
        expect(fold?.message.nl).toContain('Het logo ligt over de vouwlijnen');
    });

    it('finds a free layer on the cross, and moves it off with the least change', () => {
        const onCross: FreeLayer = {
            id: 'tekst',
            kind: 'text',
            text: 'Eva & Tim',
            x: 160,
            y: 40,
            w: 60,
            h: 20,
        };
        const edition = withCentre({ layers: [onCross] });
        expect(
            centerFoldItems(edition, resolveEdition(edition).boardCenter),
        ).toEqual([{ field: 'layer.tekst', what: 'layer' }]);

        // Its middle is right of the vertical fold: it moves right, just clear of the fold, keeping its size.
        const moved = layerOffFold(onCross, profile);
        expect(layerOnFold(moved, profile)).toBe(false);
        expect(moved.w).toBe(60);
        expect(moved.y).toBe(40);
        expect(moved.x).toBeCloseTo(186);

        // A layer too large for one square goes into the nearest free square, smaller.
        const huge: FreeLayer = { ...onCross, x: 60, y: 60, w: 240, h: 240 };
        const fitted = layerOffFold(huge, profile);
        expect(layerOnFold(fitted, profile)).toBe(false);
        expect(fitted.w).toBeLessThan(240);
    });

    it('starts a new layer in the free square the title does not use', () => {
        const squares = centerSquares(profile);

        expect(newCenterLayerSpot(profile, 'topRight')).toEqual(
            squares.bottomLeft,
        );
        expect(newCenterLayerSpot(profile, 'bottomLeft')).toEqual(
            squares.topRight,
        );
    });
});
