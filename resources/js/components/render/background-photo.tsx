import { CENTER_PHOTO_BLEED } from '@/lib/render/center-layout';
import { photoLayout, type PhotoSource } from '@/lib/render/photo';
import { mm } from '@/lib/render/units';

/**
 * A photo over a whole area, behind the rest (B125). It is not a `PhotoSlot`: the frame of the title photo
 * is the first `data-photo` in the markup, and this one has its own size (the area) and its own marker.
 *
 * The photo is laid out on the area plus `CENTER_PHOTO_BLEED` on every side, everywhere (R5-03): the board shows
 * the area, and a home sticker of the centre shows `bleed` mm more, so its cut edge is photo and not the board
 * colour. The crop the print job makes has that same size (`photoTargets`).
 */
export const BackgroundPhoto = ({
    photo,
    w,
    h,
    bleed = 0,
}: {
    photo: PhotoSource;
    w: number;
    h: number;
    /** How far past the area the photo shows, at most `CENTER_PHOTO_BLEED`. */
    bleed?: number;
}) => {
    const extra = CENTER_PHOTO_BLEED;
    const shown = Math.min(Math.max(0, bleed), extra);
    const layout = photoLayout(photo, w + 2 * extra, h + 2 * extra);

    return (
        <div
            style={{
                position: 'absolute',
                left: mm(-shown),
                top: mm(-shown),
                width: mm(w + 2 * shown),
                height: mm(h + 2 * shown),
                overflow: 'hidden',
            }}
            data-background="filled"
            data-w={w + 2 * extra}
            data-h={h + 2 * extra}
        >
            <img
                src={photo.src}
                alt=""
                draggable={false}
                style={{
                    position: 'absolute',
                    left: mm(layout.box.left - extra + shown),
                    top: mm(layout.box.top - extra + shown),
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
