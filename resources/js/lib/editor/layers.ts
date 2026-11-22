import {
    cardSpots,
    centerTitleOf,
    layoutOfTitle,
} from '@/components/render/board';
import type { CheckFold } from '@/lib/checks/types';
import { BOARD_CENTER_KEY, BOX_LID_KEY } from '@/lib/edition/keys';
import type { ResolvedCenter } from '@/lib/edition/resolve';
import { MAX_LAYERS } from '@/lib/edition/schema';
import type { Edition, FreeLayer, PhotoPlacement } from '@/lib/edition/types';
import { centerRect, foldLines, type BoardProfile } from '@/lib/print/board';
import type { Rect } from '@/lib/print/types';
import {
    coversText,
    lidLayout,
    lidTextZones,
    type LidPhoto,
} from '@/lib/render/box-lid-layout';
import {
    boxCorners,
    centerSquares,
    crossesFold,
    FOLD_CLEAR_MM,
    otherPlace,
    type CenterPlace,
    type PlacedBox,
    type Square,
} from '@/lib/render/center-layout';

export interface LayerArea {
    w: number;
    h: number;
}

const MIN_LAYER_MM = 6;

export const canAddLayer = (layers: readonly FreeLayer[]): boolean =>
    layers.length < MAX_LAYERS;

/** An id that is not used yet in `layers`. */
function newLayerId(layers: readonly FreeLayer[]): string {
    const used = new Set(layers.map((layer) => layer.id));
    for (let n = layers.length + 1; ; n++) {
        if (!used.has(`layer-${n}`)) {
            return `layer-${n}`;
        }
    }
}

/**
 * A text layer in the middle of the area, 40% as wide as the area. On the board centre `spot` is a free square, so
 * the layer starts clear of the fold lines (B187).
 */
export function newTextLayer(
    layers: readonly FreeLayer[],
    area: LayerArea,
    text: string,
    spot?: Square,
): FreeLayer {
    const w = Math.max(
        MIN_LAYER_MM,
        Math.round(Math.min(area.w * 0.4, (spot?.size ?? Infinity) * 0.9)),
    );
    const h = Math.max(MIN_LAYER_MM, Math.round(area.h * 0.1));
    const cx = spot?.cx ?? area.w / 2;
    const cy = spot?.cy ?? area.h / 2;

    return {
        id: newLayerId(layers),
        kind: 'text',
        text,
        x: Math.round(cx - w / 2),
        y: Math.round(cy - h / 2),
        w,
        h,
    };
}

export function newPhotoLayer(
    layers: readonly FreeLayer[],
    area: LayerArea,
    photo: PhotoPlacement,
    spot?: Square,
): FreeLayer {
    const size = Math.max(
        MIN_LAYER_MM,
        Math.round(Math.min(area.w, area.h) * 0.3),
    );
    const cx = spot?.cx ?? area.w / 2;
    const cy = spot?.cy ?? area.h / 2;

    return {
        id: newLayerId(layers),
        kind: 'photo',
        photo,
        x: Math.round(cx - size / 2),
        y: Math.round(cy - size / 2),
        w: size,
        h: size,
    };
}

/** Keeps the middle of a layer inside the area, so it can always be grabbed again. */
export function clampLayer(layer: FreeLayer, area: LayerArea): FreeLayer {
    const w = Math.min(Math.max(layer.w, MIN_LAYER_MM), area.w);
    const h = Math.min(Math.max(layer.h, MIN_LAYER_MM), area.h);
    const cx = Math.min(Math.max(layer.x + layer.w / 2, 0), area.w);
    const cy = Math.min(Math.max(layer.y + layer.h / 2, 0), area.h);

    return { ...layer, w, h, x: cx - w / 2, y: cy - h / 2 };
}

const round = (value: number): number => Math.round(value * 100) / 100;

export function moveLayer(
    layer: FreeLayer,
    dx: number,
    dy: number,
    area: LayerArea,
): FreeLayer {
    const moved = clampLayer(
        { ...layer, x: layer.x + dx, y: layer.y + dy },
        area,
    );

    return { ...moved, x: round(moved.x), y: round(moved.y) };
}

/** Scales around the middle of the layer; `factor` 1.1 is 10% larger. */
export function scaleLayer(
    layer: FreeLayer,
    factor: number,
    area: LayerArea,
): FreeLayer {
    const w = Math.max(MIN_LAYER_MM, layer.w * factor);
    const h = Math.max(MIN_LAYER_MM, layer.h * factor);
    const cx = layer.x + layer.w / 2;
    const cy = layer.y + layer.h / 2;
    const scaled = clampLayer(
        { ...layer, w, h, x: cx - w / 2, y: cy - h / 2 },
        area,
    );

    return {
        ...scaled,
        w: round(scaled.w),
        h: round(scaled.h),
        x: round(scaled.x),
        y: round(scaled.y),
    };
}

/** Sets the rotation in whole degrees, between -180 and 180. */
export function rotateLayer(layer: FreeLayer, degrees: number): FreeLayer {
    let next = Math.round(degrees) % 360;
    if (next > 180) next -= 360;
    if (next <= -180) next += 360;

    return next === 0
        ? (Object.fromEntries(
              Object.entries(layer).filter(([key]) => key !== 'rotation'),
          ) as FreeLayer)
        : { ...layer, rotation: next };
}

export function replaceLayer(
    layers: readonly FreeLayer[],
    next: FreeLayer,
): FreeLayer[] {
    return layers.map((layer) => (layer.id === next.id ? next : layer));
}

export interface Zone {
    /** Centre and size in mm, with the rotation in degrees; for drawing the red hatching. */
    kind: 'fold' | 'spot' | 'text';
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: number;
}

/** Where nothing may go on the board centre: the fold lines and the two card spots (B93). */
export function centerZones(profile: BoardProfile): Zone[] {
    const centre = centerRect(profile);
    const width = 8;
    const zones: Zone[] = foldLines(profile).map((line) =>
        line.orientation === 'vertical'
            ? {
                  kind: 'fold',
                  x: line.x1 - centre.x - width / 2,
                  y: 0,
                  w: width,
                  h: centre.h,
                  rotation: 0,
              }
            : {
                  kind: 'fold',
                  x: 0,
                  y: line.y1 - centre.y - width / 2,
                  w: centre.w,
                  h: width,
                  rotation: 0,
              },
    );
    for (const spot of cardSpots(profile)) {
        zones.push({
            kind: 'spot',
            x: spot.cx - spot.w / 2,
            y: spot.cy - spot.h / 2,
            w: spot.w,
            h: spot.h,
            rotation: spot.rotation,
        });
    }

    return zones;
}

/** The fixed text of a box lid as the editor and the Controle see it (bug 36 of ronde 3). */
function lidTextAreas(edition: Edition): Rect[] {
    const lid = edition.elements[BOX_LID_KEY];
    const photo: LidPhoto =
        lid?.photo === undefined
            ? 'none'
            : lid.photoStyle === 'full'
              ? 'full'
              : 'framed';

    return lidTextZones(
        lidLayout(edition.boardProfile.boxLid, {
            photo,
            offset: lid?.titleOffset,
            subtitle: lid?.subtitle !== '',
            lines: (lid?.text ?? '').trim() !== '',
        }),
    );
}

/** Where a free layer on the box lid would cover the title, the subtitle or the own lines (bug 36). */
export function lidZones(edition: Edition): Zone[] {
    return lidTextAreas(edition).map((rect) => ({
        kind: 'text',
        ...rect,
        rotation: 0,
    }));
}

/** The free layers of the box lid that lie over its fixed text (bug 36). */
export function layersOverLidText(edition: Edition): FreeLayer[] {
    const areas = lidTextAreas(edition);

    return (edition.elements[BOX_LID_KEY]?.layers ?? []).filter((layer) =>
        coversText(layer, areas),
    );
}

/** A free layer as a turned box, for the fold and card spot checks (B187). */
function boxOfLayer(layer: FreeLayer): PlacedBox {
    return {
        cx: layer.x + layer.w / 2,
        cy: layer.y + layer.h / 2,
        w: layer.w,
        h: layer.h,
        rotation: layer.rotation ?? 0,
    };
}

type Point = { x: number; y: number };

/** Whether two convex polygons overlap (separating axis test). Touching edges do not count. */
function polygonsOverlap(a: readonly Point[], b: readonly Point[]): boolean {
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
}

/** Whether a turned box lies over one of the two card spots of the centre. */
function coversCardSpot(profile: BoardProfile, box: PlacedBox): boolean {
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
}

/** Whether a free layer of the centre lies over a fold line or a card spot (B183, B187). */
export function layerOnFold(layer: FreeLayer, profile: BoardProfile): boolean {
    const box = boxOfLayer(layer);

    return crossesFold(profile, box) || coversCardSpot(profile, box);
}

/** The free layers of the board centre that lie over a fold line or a card spot. */
function centerLayersOnFold(edition: Edition): FreeLayer[] {
    return (edition.elements[BOARD_CENTER_KEY]?.layers ?? []).filter((layer) =>
        layerOnFold(layer, edition.boardProfile),
    );
}

/**
 * What lies over a fold line or a card spot of the board centre, for Controle (B183, B187): the name, the photo or
 * the logo as one item, then every free layer.
 */
export function centerFoldItems(
    edition: Edition,
    centre: ResolvedCenter,
): CheckFold[] {
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

    for (const layer of centerLayersOnFold(edition)) {
        items.push({ field: `layer.${layer.id}`, what: 'layer' });
    }

    return items;
}

/** How far a box must move along one axis to clear a fold at `at`, towards the side its middle is on. */
function clearance(min: number, max: number, middle: number, at: number) {
    if (min >= at + FOLD_CLEAR_MM || max <= at - FOLD_CLEAR_MM) {
        return 0;
    }

    return middle < at ? at - FOLD_CLEAR_MM - max : at + FOLD_CLEAR_MM - min;
}

/**
 * Moves a free layer of the centre off the fold lines and the card spots (B187): first the least it takes, to the
 * side its middle is on; when that is not enough, into the nearest free square, smaller when it does not fit.
 */
export function layerOffFold(
    layer: FreeLayer,
    profile: BoardProfile,
): FreeLayer {
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
}

/**
 * Where a new free layer of the centre starts (B183, B187): in the middle of the free square the title does not
 * use, so it never starts on the fold lines.
 */
export function newCenterLayerSpot(
    profile: BoardProfile,
    place: CenterPlace,
): Square {
    return centerSquares(profile)[otherPlace(place)];
}
