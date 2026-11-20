import { cardSpots } from '@/components/render/board';
import { MAX_LAYERS } from '@/lib/edition/schema';
import type { FreeLayer, PhotoPlacement } from '@/lib/edition/types';
import { centerRect, foldLines, type BoardProfile } from '@/lib/print/board';

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

/** A text layer in the middle of the area, a third as wide as the area. */
export function newTextLayer(
    layers: readonly FreeLayer[],
    area: LayerArea,
    text: string,
): FreeLayer {
    const w = Math.max(MIN_LAYER_MM, Math.round(area.w * 0.4));
    const h = Math.max(MIN_LAYER_MM, Math.round(area.h * 0.1));

    return {
        id: newLayerId(layers),
        kind: 'text',
        text,
        x: Math.round((area.w - w) / 2),
        y: Math.round((area.h - h) / 2),
        w,
        h,
    };
}

export function newPhotoLayer(
    layers: readonly FreeLayer[],
    area: LayerArea,
    photo: PhotoPlacement,
): FreeLayer {
    const size = Math.max(
        MIN_LAYER_MM,
        Math.round(Math.min(area.w, area.h) * 0.3),
    );

    return {
        id: newLayerId(layers),
        kind: 'photo',
        photo,
        x: Math.round((area.w - size) / 2),
        y: Math.round((area.h - size) / 2),
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
    kind: 'fold' | 'spot';
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
