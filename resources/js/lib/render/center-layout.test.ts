import { describe, expect, it } from 'vitest';

import { centerTitleOf, layoutOfTitle } from '@/components/render/board';
import { runChecks } from '@/lib/render/checks';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type {
    Edition,
    ElementOverride,
    FreeLayer,
} from '@/lib/render/edition-types';
import { buildCheckInput } from '@/lib/render/editor-checks-input';
import {
    centerFoldItems,
    layerOffFold,
    layerOnFold,
    newCenterLayerSpot,
    newPhotoLayer,
    placeNewCenterLayer,
} from '@/lib/render/editor-layers';
import { centerRect, DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { makeEdition, photo } from '@/testing/edition-test-utils';

import {
    centerLayout,
    centerSquares,
    crossesFold,
    type CenterLayoutOptions,
    type PlacedBox,
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

    it('sets the photo of "Naam met foto" straight and as large as its square (B216, R5-04)', () => {
        const square = centerSquares(profile).bottomLeft;
        const inset = 2;
        const wide = centerLayout(
            profile,
            options({ mode: 'photo', aspect: 4 / 3, frameInset: inset }),
        );
        const standing = centerLayout(
            profile,
            options({ mode: 'photo', aspect: 3 / 4, frameInset: inset }),
        );

        expect(wide.photo?.rotation).toBe(0);
        expect(wide.photo?.w).toBeCloseTo(square.size - 2 * inset);
        expect(standing.photo?.h).toBeCloseTo(square.size - 2 * inset);
        // With its frame it still stays clear of the folds and the card spots.
        const framed = standing.photo ?? { cx: 0, cy: 0, w: 0, h: 0 };
        expect(standing.photo).not.toBeNull();
        expect(
            layerOnFold(
                {
                    id: 'p',
                    kind: 'text',
                    text: 'x',
                    x: framed.cx - framed.w / 2 - inset,
                    y: framed.cy - framed.h / 2 - inset,
                    w: framed.w + 2 * inset,
                    h: framed.h + 2 * inset,
                },
                profile,
            ),
        ).toBe(false);
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

    it('puts an extra photo where it hides neither the photo nor the name (R5-07)', () => {
        const edition = withCentre({
            centerMode: 'photo',
            photo: photo(),
            photoAspect: 4 / 3,
        });
        const centre = resolveEdition(edition).boardCenter;
        const area = centerRect(profile);
        const first = newPhotoLayer(
            [],
            area,
            photo(),
            newCenterLayerSpot(profile, centre.place),
        );
        const layout = layoutOfTitle(
            profile,
            centerTitleOf(centre, undefined),
            true,
        );
        const overlaps = (layer: FreeLayer, box: PlacedBox | null) =>
            box !== null &&
            Math.abs(layer.x + layer.w / 2 - box.cx) < (layer.w + box.w) / 2 &&
            Math.abs(layer.y + layer.h / 2 - box.cy) < (layer.h + box.h) / 2;

        // Where it used to start: right on the photo of "Naam met foto".
        expect(overlaps(first, layout.photo)).toBe(true);

        const placed = placeNewCenterLayer(first, edition, centre, []);
        expect(overlaps(placed, layout.photo)).toBe(false);
        expect(layerOnFold(placed, profile)).toBe(false);

        // A second one does not land on the first either.
        const second = placeNewCenterLayer(first, edition, centre, [placed]);
        expect(
            overlaps(second, {
                cx: placed.x + placed.w / 2,
                cy: placed.y + placed.h / 2,
                w: placed.w,
                h: placed.h,
                rotation: 0,
            }),
        ).toBe(false);
        expect(overlaps(second, layout.photo)).toBe(false);
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
