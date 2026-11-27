import { layerLook, type RenderLayer } from '@/components/render/free-layers';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type {
    FreeLayer,
    PhotoPlacement,
    PhotoStyle,
} from '@/lib/render/edition-types';
import { photoSource, type PhotoInfos } from '@/lib/render/editor-photo-cache';

import type { ElementProps } from './sheet';

export type PreviewPart = {
    target: { key: string; deed?: boolean };
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    common: ElementProps;
};

export const partSource =
    (photos: PhotoInfos) =>
    (placement: PhotoPlacement | undefined, style?: PhotoStyle) =>
        photoSource(placement, photos, style);

/** Free layers with their photos turned into sources, for the renderers. */
export const toRenderLayers = (
    layers: readonly FreeLayer[],
    photos: PhotoInfos,
): RenderLayer[] => {
    return layers.map((layer): RenderLayer => {
        const box = {
            id: layer.id,
            x: layer.x,
            y: layer.y,
            w: layer.w,
            h: layer.h,
            ...(layer.rotation === undefined
                ? {}
                : { rotation: layer.rotation }),
        };

        return layer.kind === 'text'
            ? { ...box, kind: 'text', text: layer.text, ...layerLook(layer) }
            : {
                  ...box,
                  kind: 'photo',
                  photo: photoSource(layer.photo, photos),
              };
    });
};
