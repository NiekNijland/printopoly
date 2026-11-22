import type { PhotoPlacement } from '@/lib/edition/types';
import {
    photoQuality,
    placementTarget,
    type PhotoQuality,
} from '@/lib/photos/resolution';
import {
    clampTransform,
    coverTransform,
    nudge,
    panBy,
    rotateQuarter,
    setFit,
    setZoom,
    startingPoint,
    zoomBy,
    type Direction,
} from '@/lib/photos/transform';
import type { PhotoTransform, Rotation } from '@/lib/photos/types';
import type { Size } from '@/lib/print/types';

export function normalizeRotation(degrees: number): Rotation {
    const turns = Math.round(degrees / 90);

    return ((((turns * 90) % 360) + 360) % 360) as Rotation;
}

function toPlacement(
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
        ...(transform.fit === true ? { fit: true } : {}),
    };
}

function toTransform(placement: PhotoPlacement): PhotoTransform {
    return {
        x: placement.cx,
        y: placement.cy,
        scale: placement.scale,
        rotation: normalizeRotation(placement.rotation),
        grayscale: placement.grayscale,
        ...(placement.fit === true ? { fit: true } : {}),
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

/**
 * Where a new photo starts (ronde 3, UX 1): filling its frame at 100%, in the middle, but a standing photo starts
 * higher up so heads and faces stay in (the frame clamps it again when the photo is drawn). With the `target` it
 * prints on (frame plus bleed) the faces land a third from the top of the frame (R5-03).
 */
export function startingPlacement(
    photoId: string,
    size: { width: number; height: number },
    target?: Size,
): PhotoPlacement {
    const start = startingPoint({ w: size.width, h: size.height }, target);

    return {
        photoId,
        cx: start.x,
        cy: start.y,
        scale: 1,
        rotation: 0,
        grayscale: false,
    };
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
    | { type: 'grayscale'; on: boolean }
    | { type: 'fit'; on: boolean };

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
        case 'fit':
            next = setFit(source, t, area, action.on);
            break;
    }

    return toPlacement(placement.photoId, next);
}

/** The dpi this placement has on paper (B94), as it prints (kept on its frame). */
export function placementDpi(
    placement: PhotoPlacement,
    context: PlacementContext,
): number {
    return placementQuality(placement, context).dpi;
}

/** How this placement prints (B251): the same measure the check uses, so the editor never says otherwise. */
export function placementQuality(
    placement: PhotoPlacement,
    context: PlacementContext,
): PhotoQuality {
    return photoQuality(
        context.source,
        toTransform(placement),
        context.frame,
        context.bleed,
    );
}
