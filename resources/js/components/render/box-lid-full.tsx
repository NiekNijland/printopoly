import type { ReactNode } from 'react';

import type { BoxLidStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';

import { FullPhotoFrame, bandStyle } from './box-lid-look';
import { BAND_OPACITY, LIGHT_TEXT_SHADOW, PhotoSlot } from './photo-slot';
import { Abs, useRender } from './sheet';

/** A dark fade behind light text on a photo without the band: strongest in the middle of the text block. */
const TEXT_FADE =
    'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0))';

export const FullPhotoLid = ({
    w,
    h,
    bleed,
    photo,
    look,
    block,
    onPhoto,
    text,
}: {
    w: number;
    h: number;
    bleed: number;
    photo?: PhotoSource;
    look: BoxLidStyle | undefined;
    block: { y: number; h: number };
    onPhoto: boolean;
    text: ReactNode;
}) => {
    const { theme } = useRender();
    const band = onPhoto
        ? { inset: 0, style: {} }
        : bandStyle(look, theme, BAND_OPACITY);

    return (
        <>
            <PhotoSlot
                x={-bleed}
                y={-bleed}
                w={w + 2 * bleed}
                h={h + 2 * bleed}
                photo={photo}
            />
            <FullPhotoFrame look={look} w={w} h={h} />
            <Abs
                x={-bleed + band.inset}
                y={block.y - (onPhoto ? 8 : 0)}
                w={w + 2 * bleed - 2 * band.inset}
                h={block.h + (onPhoto ? 16 : 0)}
                style={onPhoto ? { background: TEXT_FADE } : band.style}
                slot={onPhoto ? 'text-fade' : 'name-band'}
            />
            {onPhoto ? (
                <Abs
                    x={0}
                    y={0}
                    w={w}
                    h={h}
                    style={{ textShadow: LIGHT_TEXT_SHADOW }}
                >
                    {text}
                </Abs>
            ) : (
                text
            )}
        </>
    );
};
