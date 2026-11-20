import { photoLayout, type PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';

/**
 * A photo over a whole area, behind the rest (B125). It is not a `PhotoSlot`: the frame of the title photo
 * is the first `data-photo` in the markup, and this one has its own size (the area) and its own marker.
 */
export function BackgroundPhoto({
    photo,
    w,
    h,
}: {
    photo: PhotoSource;
    w: number;
    h: number;
}) {
    const layout = photoLayout(photo, w, h);

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: mm(w),
                height: mm(h),
                overflow: 'hidden',
            }}
            data-background="filled"
            data-w={w}
            data-h={h}
        >
            <img
                src={photo.src}
                alt=""
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
