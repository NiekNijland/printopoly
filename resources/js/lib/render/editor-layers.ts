import { cardSpots } from '@/components/render/board';
import {
    coversText,
    lidLayout,
    lidTextZones,
    type LidPhoto,
} from '@/lib/render/box-lid-layout';
import { type Square } from '@/lib/render/center-layout';
import { BOX_LID_KEY } from '@/lib/render/edition-keys';
import { lidShowsLogo } from '@/lib/render/edition-resolve-elements';
import { MAX_LAYERS } from '@/lib/render/edition-schema-limits';
import type {
    Edition,
    FreeLayer,
    PhotoPlacement,
} from '@/lib/render/edition-types';
import {
    centerRect,
    foldLines,
    type BoardProfile,
} from '@/lib/render/print-board';
import type { Rect } from '@/types/print';

export type LayerArea = {
    w: number;
    h: number;
};

export const MIN_LAYER_MM = 6;

export const canAddLayer = (layers: readonly FreeLayer[]): boolean =>
    layers.length < MAX_LAYERS;

/** An id that is not used yet in `layers`. */
const newLayerId = (layers: readonly FreeLayer[]): string => {
    const used = new Set(layers.map((layer) => layer.id));
    for (let n = layers.length + 1; ; n++) {
        if (!used.has(`layer-${n}`)) {
            return `layer-${n}`;
        }
    }
};

/**
 * A text layer in the middle of the area, 40% as wide as the area. On the board centre `spot` is a free square, so
 * the layer starts clear of the fold lines (B187).
 */
export const newTextLayer = (
    layers: readonly FreeLayer[],
    area: LayerArea,
    text: string,
    spot?: Square,
): FreeLayer => {
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
};

export const newPhotoLayer = (
    layers: readonly FreeLayer[],
    area: LayerArea,
    photo: PhotoPlacement,
    spot?: Square,
): FreeLayer => {
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
};

/** Keeps the middle of a layer inside the area, so it can always be grabbed again. */
export const clampLayer = (layer: FreeLayer, area: LayerArea): FreeLayer => {
    const w = Math.min(Math.max(layer.w, MIN_LAYER_MM), area.w);
    const h = Math.min(Math.max(layer.h, MIN_LAYER_MM), area.h);
    const cx = Math.min(Math.max(layer.x + layer.w / 2, 0), area.w);
    const cy = Math.min(Math.max(layer.y + layer.h / 2, 0), area.h);

    return { ...layer, w, h, x: cx - w / 2, y: cy - h / 2 };
};

export const round = (value: number): number => Math.round(value * 100) / 100;

export const moveLayer = (
    layer: FreeLayer,
    dx: number,
    dy: number,
    area: LayerArea,
): FreeLayer => {
    const moved = clampLayer(
        { ...layer, x: layer.x + dx, y: layer.y + dy },
        area,
    );

    return { ...moved, x: round(moved.x), y: round(moved.y) };
};

/** Scales around the middle of the layer; `factor` 1.1 is 10% larger. */
export const scaleLayer = (
    layer: FreeLayer,
    factor: number,
    area: LayerArea,
): FreeLayer => {
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
};

/** Sets the rotation in whole degrees, between -180 and 180. */
export const rotateLayer = (layer: FreeLayer, degrees: number): FreeLayer => {
    let next = Math.round(degrees) % 360;
    if (next > 180) next -= 360;
    if (next <= -180) next += 360;
    const { rotation: _rotation, ...unturned } = layer;

    return next === 0 ? unturned : { ...layer, rotation: next };
};

export const replaceLayer = (
    layers: readonly FreeLayer[],
    next: FreeLayer,
): FreeLayer[] => {
    return layers.map((layer) => (layer.id === next.id ? next : layer));
};

export type Zone = {
    /** Centre and size in mm, with the rotation in degrees; for drawing the red hatching. */
    kind: 'fold' | 'spot' | 'text';
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: number;
};

/** Where nothing may go on the board centre: the fold lines and the two card spots (B93). */
export const centerZones = (profile: BoardProfile): Zone[] => {
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
};

/** The fixed text of a box lid as the editor and the Controle see it (bug 36 of ronde 3). */
const lidTextAreas = (edition: Edition): Rect[] => {
    const lid = edition.elements[BOX_LID_KEY];
    const photo: LidPhoto =
        lid?.photo === undefined
            ? 'none'
            : lidShowsLogo(edition)
              ? 'logo'
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
};

/** Where a free layer on the box lid would cover the title, the subtitle or the own lines (bug 36). */
export const lidZones = (edition: Edition): Zone[] => {
    return lidTextAreas(edition).map((rect) => ({
        kind: 'text',
        ...rect,
        rotation: 0,
    }));
};

/** The free layers of the box lid that lie over its fixed text (bug 36). */
export const layersOverLidText = (edition: Edition): FreeLayer[] => {
    const areas = lidTextAreas(edition);

    return (edition.elements[BOX_LID_KEY]?.layers ?? []).filter((layer) =>
        coversText(layer, areas),
    );
};
