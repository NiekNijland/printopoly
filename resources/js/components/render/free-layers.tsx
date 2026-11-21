import type { LayerAlign, LayerFont } from '@/lib/edition/types';
import type { PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';

import { FitText } from './fit-text';
import { PhotoSlot } from './photo-slot';

/** A free layer as the renderers draw it: position and size in mm, a photo already turned into a source. */
export type RenderLayer = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    /** Degrees clockwise around the middle of the layer. */
    rotation?: number;
} & (
    | {
          kind: 'text';
          text: string;
          /** Own colour, letter and alignment of a text layer (B169); the theme ink, heading and centred when absent. */
          color?: string;
          font?: LayerFont;
          align?: LayerAlign;
      }
    | { kind: 'photo'; photo?: PhotoSource }
);

/** The look of a text layer as stored, for the renderers: only what is set. */
export function layerLook(layer: {
    color?: string;
    font?: LayerFont;
    align?: LayerAlign;
}): { color?: string; font?: LayerFont; align?: LayerAlign } {
    return {
        ...(layer.color === undefined ? {} : { color: layer.color }),
        ...(layer.font === undefined ? {} : { font: layer.font }),
        ...(layer.align === undefined ? {} : { align: layer.align }),
    };
}

export interface FreeLayersProps {
    layers: readonly RenderLayer[];
}

/** Free text and photo layers over an element (B42, B43). Coordinates are in mm from the top left of the element. */
export function FreeLayers({ layers }: FreeLayersProps) {
    return (
        <>
            {layers.map((layer) => (
                <div
                    key={layer.id}
                    data-layer={layer.id}
                    style={{
                        position: 'absolute',
                        left: mm(layer.x),
                        top: mm(layer.y),
                        width: mm(layer.w),
                        height: mm(layer.h),
                        transform:
                            layer.rotation === undefined || layer.rotation === 0
                                ? undefined
                                : `rotate(${layer.rotation}deg)`,
                        transformOrigin: 'center',
                    }}
                >
                    {layer.kind === 'text' ? (
                        <FitText
                            text={layer.text}
                            x={0}
                            y={0}
                            w={layer.w}
                            h={layer.h}
                            maxFontMm={Math.max(3, layer.h)}
                            minFontMm={2}
                            wrap="words"
                            font={layer.font ?? 'heading'}
                            color={layer.color}
                            align={layer.align ?? 'center'}
                            slot={`layer-${layer.id}`}
                        />
                    ) : (
                        <PhotoSlot
                            x={0}
                            y={0}
                            w={layer.w}
                            h={layer.h}
                            photo={layer.photo}
                        />
                    )}
                </div>
            ))}
        </>
    );
}
