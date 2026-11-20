import { DEFAULT_PHOTO_TRANSFORM, photoLayout, type PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';

export interface PhotoSlotProps {
    /** Slot position and size in mm, relative to the parent. */
    x: number;
    y: number;
    w: number;
    h: number;
    photo?: PhotoSource;
    /** Flat tint shown when there is no photo yet (the editor); nothing in print. */
    placeholder?: string;
    alt?: string;
}

/** A photo cropped to a slot: pan, zoom, quarter-turn rotation and black-and-white. */
export function PhotoSlot({ x, y, w, h, photo, placeholder, alt = '' }: PhotoSlotProps) {
    const base = {
        position: 'absolute',
        left: mm(x),
        top: mm(y),
        width: mm(w),
        height: mm(h),
        overflow: 'hidden',
    } as const;

    if (photo === undefined) {
        return placeholder === undefined ? null : (
            <div style={{ ...base, background: placeholder }} data-photo="empty" />
        );
    }

    const layout = photoLayout(photo.transform ?? DEFAULT_PHOTO_TRANSFORM, w, h);

    return (
        <div style={base} data-photo="filled">
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
                    objectFit: 'cover',
                    transform: layout.transform,
                    transformOrigin: 'center',
                    filter: layout.filter,
                    maxWidth: 'none',
                }}
            />
        </div>
    );
}
