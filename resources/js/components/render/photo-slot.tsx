import { photoLayout, type PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';

export interface PhotoSlotProps {
    /** Slot position and size in mm, relative to the parent. */
    x: number;
    y: number;
    w: number;
    h: number;
    photo?: PhotoSource;
    alt?: string;
}

/** A photo cropped to a slot: pan, zoom, quarter-turn rotation and black-and-white. */
export function PhotoSlot({ x, y, w, h, photo, alt = '' }: PhotoSlotProps) {
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
                    objectFit: 'fill',
                    transform: layout.transform,
                    transformOrigin: 'center',
                    filter: layout.filter,
                    maxWidth: 'none',
                }}
            />
        </div>
    );
}
