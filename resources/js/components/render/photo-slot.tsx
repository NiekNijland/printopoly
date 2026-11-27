import { photoLayout, type PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';

export type PhotoSlotProps = {
    /** Slot position and size in mm, relative to the parent. */
    x: number;
    y: number;
    w: number;
    h: number;
    photo?: PhotoSource;
    alt?: string;
};

/** A photo cropped to a slot: pan, zoom, quarter-turn rotation and black-and-white. */
export const PhotoSlot = ({ x, y, w, h, photo, alt = '' }: PhotoSlotProps) => {
    const base = {
        position: 'absolute',
        left: mm(x),
        top: mm(y),
        width: mm(w),
        height: mm(h),
        overflow: 'hidden',
    } as const;

    if (photo === undefined) {
        return null;
    }

    const layout = photoLayout(photo, w, h);

    return (
        <div style={base} data-photo="filled" data-w={w} data-h={h}>
            <img
                src={photo.src}
                alt={alt}
                draggable={false}
                style={{
                    position: 'absolute',
                    left: mm(layout.box.left),
                    top: mm(layout.box.top),
                    width: mm(layout.box.width),
                    height: mm(layout.box.height),
                    objectFit: layout.objectFit,
                    transform: layout.transform,
                    transformOrigin: 'center',
                    filter: layout.filter,
                    maxWidth: 'none',
                }}
            />
        </div>
    );
};

/** True for a photo that fills its element instead of sitting in a frame (B124). */
export const isFullPhoto = (photo: PhotoSource | undefined): boolean => {
    return photo !== undefined && photo.style === 'full';
};

/** Opacity of the light band that carries a name over a photo. */
export const BAND_OPACITY = 0.88;

/** Shadow that keeps white text readable on any photo. */
export const LIGHT_TEXT_SHADOW = '0 0.15mm 0.7mm rgba(0, 0, 0, 0.75)';

/** Darkens the lower part of a photo so white text on it reads: transparent at the top, dark at the bottom. */
export const BOTTOM_SCRIM =
    'linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0))';
