import { centerTitleOf, layoutOfTitle } from '@/components/render/board';
import {
    boxCorners,
    centerSquares,
    otherPlace,
    type CenterPlace,
    type PlacedBox,
    type Square,
} from '@/lib/render/center-layout';
import type { ResolvedCenter } from '@/lib/render/edition-resolve';
import type { Edition, FreeLayer } from '@/lib/render/edition-types';
import {
    boxOfLayer,
    layerOnFold,
    polygonsOverlap,
} from '@/lib/render/editor-layer-fold';
import { MIN_LAYER_MM, round } from '@/lib/render/editor-layers';
import { centerRect, type BoardProfile } from '@/lib/render/print-board';

/** What a new layer of the centre must not cover: the name, the photo, the logo and the layers already there. */
const takenInCentre = (
    edition: Edition,
    centre: ResolvedCenter,
    layers: readonly FreeLayer[],
): PlacedBox[] => {
    const profile = edition.boardProfile;
    const title = centerTitleOf(centre, undefined);
    const withImage = centre.mode !== 'name' && centre.photo !== undefined;
    const layout = layoutOfTitle(profile, title, withImage);
    const unit = centerRect(profile).w / 360;
    // The photo of "Naam met foto" has its frame around it.
    const inset = centre.photoFrame === false ? 0 : 2.4 * unit;
    const taken: PlacedBox[] = layers.map(boxOfLayer);

    // A logo takes the place of the name (B187).
    if (!centre.titleHidden && !(centre.mode === 'logo' && withImage)) {
        taken.push(layout.title);
    }
    if (layout.photo !== null) {
        taken.push({
            ...layout.photo,
            w: layout.photo.w + 2 * inset,
            h: layout.photo.h + 2 * inset,
        });
    }
    if (layout.logo !== null) {
        taken.push(layout.logo);
    }

    return taken;
};

/**
 * Puts a new free layer of the centre on a free spot (R5-07): clear of the folds and the card spots (B187), and of
 * the name, the photo, the logo and the other layers, so it never hides what is already there. It tries the free
 * square the name does not use, then the other free squares and their corners, at its own size and then smaller.
 * When nothing is free it stays where it was given.
 */
export const placeNewCenterLayer = (
    layer: FreeLayer,
    edition: Edition,
    centre: ResolvedCenter,
    layers: readonly FreeLayer[],
): FreeLayer => {
    const profile = edition.boardProfile;
    const area = centerRect(profile);
    const taken = takenInCentre(edition, centre, layers);
    const squares = centerSquares(profile);
    const other = otherPlace(centre.place);
    const own = other === 'topRight' ? squares.bottomLeft : squares.topRight;
    // The squares of the card spots, for their free corners.
    const topLeft: Square = {
        cx: squares.bottomLeft.cx,
        cy: squares.topRight.cy,
        size: Math.min(squares.bottomLeft.size, squares.topRight.size),
    };
    const bottomRight: Square = {
        cx: squares.topRight.cx,
        cy: squares.bottomLeft.cy,
        size: Math.min(squares.bottomLeft.size, squares.topRight.size),
    };
    const order = [squares[other], own, topLeft, bottomRight];

    for (const factor of [1, 0.75, 0.55, 0.4]) {
        const w = round(Math.max(MIN_LAYER_MM, layer.w * factor));
        const h = round(Math.max(MIN_LAYER_MM, layer.h * factor));

        for (const square of order) {
            const dx = Math.max(0, (square.size - w) / 2);
            const dy = Math.max(0, (square.size - h) / 2);
            const spots = [
                [0, 0],
                [-dx, -dy],
                [dx, -dy],
                [-dx, dy],
                [dx, dy],
            ] as const;

            for (const [ox, oy] of spots) {
                const placed: FreeLayer = {
                    ...layer,
                    w,
                    h,
                    x: round(square.cx + ox - w / 2),
                    y: round(square.cy + oy - h / 2),
                };
                const box = boxOfLayer(placed);
                const inside =
                    placed.x >= 0 &&
                    placed.y >= 0 &&
                    placed.x + w <= area.w &&
                    placed.y + h <= area.h;
                const free =
                    inside &&
                    !layerOnFold(placed, profile) &&
                    !taken.some((used) =>
                        polygonsOverlap(boxCorners(box), boxCorners(used)),
                    );

                if (free) {
                    return placed;
                }
            }
        }
    }

    return layer;
};

/**
 * Where a new free layer of the centre starts (B183, B187): in the middle of the free square the title does not
 * use, so it never starts on the fold lines.
 */
export const newCenterLayerSpot = (
    profile: BoardProfile,
    place: CenterPlace,
): Square => {
    return centerSquares(profile)[otherPlace(place)];
};
