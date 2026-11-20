import type { PhotoPlacement } from '@/lib/edition/types';
import { effectiveDpi, placementTarget } from '@/lib/photos/resolution';
import {
    clampTransform,
    coverTransform,
    nudge,
    panBy,
    rotateQuarter,
    setZoom,
    zoomBy,
    type Direction,
} from '@/lib/photos/transform';
import type { PhotoTransform, Rotation } from '@/lib/photos/types';
import type { Size } from '@/lib/print/types';

/** Printed bleed of a full-bleed photo, in mm (B5). */
export const FULL_BLEED_MM = 3;

export function normalizeRotation(degrees: number): Rotation {
    const turns = Math.round(degrees / 90);

    return ((((turns * 90) % 360) + 360) % 360) as Rotation;
}

export function toPlacement(
    photoId: string,
    transform: PhotoTransform,
): PhotoPlacement {
    return {
        photoId,
        cx: transform.x,
        cy: transform.y,
        scale: transform.scale,
        rotation: transform.rotation,
        grayscale: transform.grayscale,
    };
}

function toTransform(placement: PhotoPlacement): PhotoTransform {
    return {
        x: placement.cx,
        y: placement.cy,
        scale: placement.scale,
        rotation: normalizeRotation(placement.rotation),
        grayscale: placement.grayscale,
    };
}

/** What a photo in a frame is measured against: its pixels and the printed target (frame plus bleed). */
export interface PlacementContext {
    source: Size;
    /** The visible frame in mm. */
    frame: Size;
    /** 3 for a photo over the whole element, else 0. */
    bleed: number;
}

function target(context: PlacementContext): Size {
    return placementTarget(context.frame, context.bleed);
}

/** A photo that covers the frame, centred, at 100%. */
export function newPlacement(
    photoId: string,
    context: PlacementContext,
): PhotoPlacement {
    return toPlacement(
        photoId,
        coverTransform(context.source, target(context)),
    );
}

export type PlacementAction =
    | { type: 'pan'; dxMm: number; dyMm: number }
    | { type: 'nudge'; direction: Direction }
    | { type: 'zoom-to'; scale: number }
    | { type: 'zoom-by'; delta: number }
    | { type: 'rotate'; turns: 1 | -1 }
    | { type: 'grayscale'; on: boolean };

/** The placement after an action, always kept inside the photo so the frame stays covered. */
export function actOnPlacement(
    placement: PhotoPlacement,
    context: PlacementContext,
    action: PlacementAction,
): PhotoPlacement {
    const t = toTransform(placement);
    const { source } = context;
    const area = target(context);
    let next: PhotoTransform;

    switch (action.type) {
        case 'pan':
            next = panBy(source, t, area, action.dxMm, action.dyMm);
            break;
        case 'nudge':
            next = nudge(source, t, area, action.direction);
            break;
        case 'zoom-to':
            next = setZoom(source, t, area, action.scale);
            break;
        case 'zoom-by':
            next = zoomBy(source, t, area, action.delta);
            break;
        case 'rotate':
            next = rotateQuarter(source, t, area, action.turns);
            break;
        case 'grayscale':
            next = clampTransform(source, { ...t, grayscale: action.on }, area);
            break;
    }

    return toPlacement(placement.photoId, next);
}

/** The dpi this placement has on paper (B94). */
export function placementDpi(
    placement: PhotoPlacement,
    context: PlacementContext,
): number {
    return effectiveDpi(
        context.source,
        toTransform(placement),
        target(context),
    );
}

/** The frame changed (another layout or board profile): keep the picture inside it. */
export function refitPlacement(
    placement: PhotoPlacement,
    context: PlacementContext,
): PhotoPlacement {
    return toPlacement(
        placement.photoId,
        clampTransform(context.source, toTransform(placement), target(context)),
    );
}
