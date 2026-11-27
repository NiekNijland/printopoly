import {
    cardSpots,
    centerTitleOf,
    layoutOfTitle,
} from '@/components/render/board';
import {
    boxCorners,
    CENTER_PHOTO_BLEED,
    centerSquares,
    crossesFold,
    FOLD_CLEAR_MM,
    type PlacedBox,
} from '@/lib/render/center-layout';
import type { CheckFold } from '@/lib/render/checks-types';
import { BOARD_CENTER_KEY } from '@/lib/render/edition-keys';
import type { ResolvedCenter } from '@/lib/render/edition-resolve';
import type {
    Edition,
    FreeLayer,
    PhotoPlacement,
} from '@/lib/render/edition-types';
import { MIN_LAYER_MM, round } from '@/lib/render/editor-layers';
import { placementTarget } from '@/lib/render/photos-resolution';
import { subjectOffset } from '@/lib/render/photos-transform';
import {
    centerRect,
    foldLines,
    type BoardProfile,
} from '@/lib/render/print-board';
import type { Size } from '@/types/print';

/** A free layer as a turned box, for the fold and card spot checks (B187). */
export const boxOfLayer = (layer: FreeLayer): PlacedBox => {
    return {
        cx: layer.x + layer.w / 2,
        cy: layer.y + layer.h / 2,
        w: layer.w,
        h: layer.h,
        rotation: layer.rotation ?? 0,
    };
};

type Point = { x: number; y: number };

/** Whether two convex polygons overlap (separating axis test). Touching edges do not count. */
export const polygonsOverlap = (
    a: readonly Point[],
    b: readonly Point[],
): boolean => {
    for (const shape of [a, b]) {
        for (const [index, point] of shape.entries()) {
            const next = shape[(index + 1) % shape.length] ?? point;
            const axis = { x: point.y - next.y, y: next.x - point.x };
            const project = (polygon: readonly Point[]) =>
                polygon.map((corner) => corner.x * axis.x + corner.y * axis.y);
            const pa = project(a);
            const pb = project(b);
            if (
                Math.max(...pa) <= Math.min(...pb) ||
                Math.max(...pb) <= Math.min(...pa)
            ) {
                return false;
            }
        }
    }

    return true;
};

/** Whether a turned box lies over one of the two card spots of the centre. */
const coversCardSpot = (profile: BoardProfile, box: PlacedBox): boolean => {
    const corners = boxCorners(box);

    return cardSpots(profile).some((spot) =>
        polygonsOverlap(
            corners,
            boxCorners({
                cx: spot.cx,
                cy: spot.cy,
                w: spot.w,
                h: spot.h,
                rotation: spot.rotation,
            }),
        ),
    );
};

/** Whether a free layer of the centre lies over a fold line or a card spot (B183, B187). */
export const layerOnFold = (
    layer: FreeLayer,
    profile: BoardProfile,
): boolean => {
    const box = boxOfLayer(layer);

    return crossesFold(profile, box) || coversCardSpot(profile, box);
};

/** The free layers of the board centre that lie over a fold line or a card spot. */
const centerLayersOnFold = (edition: Edition): FreeLayer[] => {
    return (edition.elements[BOARD_CENTER_KEY]?.layers ?? []).filter((layer) =>
        layerOnFold(layer, edition.boardProfile),
    );
};

/**
 * What lies over a fold line or a card spot of the board centre, for Controle (B183, B187): the name, the photo or
 * the logo as one item, then every free layer.
 */
export const centerFoldItems = (
    edition: Edition,
    centre: ResolvedCenter,
    /** The pixel size of the photo over the whole centre, when it is known (B261). */
    backgroundSize?: Size,
): CheckFold[] => {
    const profile = edition.boardProfile;
    const title = centerTitleOf(centre, undefined);
    const withImage = centre.mode !== 'name' && centre.photo !== undefined;
    const layout = layoutOfTitle(profile, title, withImage);
    const items: CheckFold[] = [];
    const onFold = (box: PlacedBox | null): boolean =>
        box !== null && crossesFold(profile, box);

    if (layout.logo !== null) {
        if (onFold(layout.logo)) {
            items.push({ field: 'center-place', what: 'logo' });
        }
    } else if (
        onFold(layout.photo) ||
        (withImage && layout.photo === null && onFold(layout.title))
    ) {
        items.push({ field: 'center-place', what: 'photo' });
    } else if (!centre.titleHidden && onFold(layout.title)) {
        items.push({ field: 'center-place', what: 'name' });
    }

    if (
        centre.background !== undefined &&
        backgroundSize !== undefined &&
        faceOnFold(profile, centre.background, backgroundSize)
    ) {
        items.push({ field: 'background', what: 'face' });
    }

    for (const layer of centerLayersOnFold(edition)) {
        items.push({ field: `layer.${layer.id}`, what: 'layer' });
    }

    return items;
};

/** How close a fold may come to the middle of a photo over the centre before it runs through a face: ~26 mm. */
const FACE_REACH = 0.08;

/**
 * Whether a fold runs through the middle of a photo over the whole board centre, at its face line (R6 Tom, Sara;
 * B261), like the warning for a logo on the fold. A face is not detected: the middle a third from the top is where
 * it usually is (B217).
 */
export const faceOnFold = (
    profile: BoardProfile,
    placement: PhotoPlacement,
    size: Size,
): boolean => {
    const centre = centerRect(profile);
    const target = placementTarget(
        { w: centre.w, h: centre.h },
        CENTER_PHOTO_BLEED,
    );
    const offset = subjectOffset(size, target, {
        x: placement.cx,
        y: placement.cy,
        scale: placement.scale,
        rotation: placement.rotation,
    });
    const reach = FACE_REACH * Math.min(centre.w, centre.h);

    return Math.abs(offset.x) < reach || Math.abs(offset.y) < reach;
};

/** How far a box must move along one axis to clear a fold at `at`, towards the side its middle is on. */
const clearance = (min: number, max: number, middle: number, at: number) => {
    if (min >= at + FOLD_CLEAR_MM || max <= at - FOLD_CLEAR_MM) {
        return 0;
    }

    return middle < at ? at - FOLD_CLEAR_MM - max : at + FOLD_CLEAR_MM - min;
};

/**
 * Moves a free layer of the centre off the fold lines and the card spots (B187): first the least it takes, to the
 * side its middle is on; when that is not enough, into the nearest free square, smaller when it does not fit.
 */
export const layerOffFold = (
    layer: FreeLayer,
    profile: BoardProfile,
): FreeLayer => {
    const centre = centerRect(profile);
    const box = boxOfLayer(layer);
    const corners = boxCorners(box);
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);
    const [minX, maxX, minY, maxY] = [
        Math.min(...xs),
        Math.max(...xs),
        Math.min(...ys),
        Math.max(...ys),
    ];
    let dx = 0;
    let dy = 0;

    for (const line of foldLines(profile)) {
        if (line.orientation === 'vertical') {
            dx = clearance(minX, maxX, box.cx, line.x1 - centre.x);
        } else {
            dy = clearance(minY, maxY, box.cy, line.y1 - centre.y);
        }
    }

    const pushed = {
        ...layer,
        x: round(layer.x + dx),
        y: round(layer.y + dy),
    };
    const inside =
        minX + dx >= 0 &&
        maxX + dx <= centre.w &&
        minY + dy >= 0 &&
        maxY + dy <= centre.h;
    if (inside && !layerOnFold(pushed, profile)) {
        return pushed;
    }

    const squares = centerSquares(profile);
    const square = [squares.topRight, squares.bottomLeft].reduce(
        (best, next) =>
            Math.hypot(next.cx - box.cx, next.cy - box.cy) <
            Math.hypot(best.cx - box.cx, best.cy - box.cy)
                ? next
                : best,
    );
    const factor = Math.min(
        1,
        (square.size * 0.9) / Math.max(maxX - minX, maxY - minY),
    );
    const w = round(Math.max(MIN_LAYER_MM, layer.w * factor));
    const h = round(Math.max(MIN_LAYER_MM, layer.h * factor));

    return {
        ...layer,
        w,
        h,
        x: round(square.cx - w / 2),
        y: round(square.cy - h / 2),
    };
};

/**
 * "Verschuiven" for a photo over the whole centre with its middle on a fold (B261): it zooms in as far as needed
 * (at most 3×) to slide the middle of the photo to the middle of the half it leans to, and lifts the face line
 * above the horizontal fold as a new photo starts (B217). The photo keeps covering the centre.
 */
export const faceOffFold = (
    profile: BoardProfile,
    placement: PhotoPlacement,
    size: Size,
): PhotoPlacement => {
    const centre = centerRect(profile);
    const target = placementTarget(
        { w: centre.w, h: centre.h },
        CENTER_PHOTO_BLEED,
    );
    const turned =
        Math.abs(placement.rotation) % 180 === 90
            ? { w: size.h, h: size.w }
            : size;
    const aspect = turned.w / turned.h;
    const base = Math.max(target.w, target.h * aspect);
    // Wide enough to put the middle a quarter of the centre away from the fold: 1.5 times the centre.
    const scale = Math.min(
        3,
        Math.max(placement.scale, (1.5 * target.w) / base),
    );
    const width = base * scale;
    const height = width / aspect;
    const side = placement.cx > 0.5 ? -1 : 1;
    const shownW = target.w / width;
    const shownH = target.h / height;
    const clamp = (value: number, shown: number) =>
        Math.min(1 - shown / 2, Math.max(shown / 2, value));
    const offset = subjectOffset(size, target, {
        x: placement.cx,
        y: placement.cy,
        scale,
        rotation: placement.rotation,
    });
    const reach = FACE_REACH * Math.min(centre.w, centre.h);

    return {
        ...placement,
        scale,
        cx: clamp(0.5 + (side * target.w) / (4 * width), shownW),
        cy:
            Math.abs(offset.y) < reach
                ? clamp(1 / 3 + target.h / (6 * height), shownH)
                : clamp(placement.cy, shownH),
    };
};
