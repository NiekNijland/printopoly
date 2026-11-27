import { photoLayout, type PhotoSource } from '@/lib/render/photo';
import type { SpaceIconPreset } from '@/lib/render/space-icons';
import { mm } from '@/lib/render/units';

import { Icon, isIconName, type IconName } from './icons';
import { LUCIDE_SPACE_ICONS } from './lucide-space-icons';

/** The image of a special space as the renderers take it (B136): one of our icons, or an uploaded image. */
export type SpaceIconSource =
    | { preset: SpaceIconPreset }
    | {
          photo: PhotoSource;
          /** Width over height of the image, so it is drawn whole inside the icon box. */
          aspect: number;
      };

export type SpaceIconArtProps = {
    /** The edition's choice; without it the standard icon is drawn. */
    icon?: SpaceIconSource;
    /** The standard icon, or `null` when the space has none without a choice. */
    fallback: IconName | null;
    /** Top-left corner and side of the square icon box, in mm. */
    x: number;
    y: number;
    size: number;
    color: string;
    strokeWidth?: number;
};

/** The box an image of this shape takes inside a square of `size`, centred. */
const containedBox = (
    aspect: number,
    size: number,
): { dx: number; dy: number; w: number; h: number } => {
    const safe = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    const w = safe >= 1 ? size : size * safe;
    const h = safe >= 1 ? size / safe : size;

    return { dx: (size - w) / 2, dy: (size - h) / 2, w, h };
};

/**
 * The icon of a special space: a chosen icon in the line of the theme, or an uploaded image drawn whole
 * (transparent parts stay transparent). The image box carries `data-icon-photo` so the print pipeline can
 * measure the size it is cropped to (lib/render/print-photo-targets.ts).
 */
export const SpaceIconArt = ({
    icon,
    fallback,
    x,
    y,
    size,
    color,
    strokeWidth,
}: SpaceIconArtProps) => {
    if (icon !== undefined && 'photo' in icon) {
        const box = containedBox(icon.aspect, size);
        const layout = photoLayout(icon.photo, box.w, box.h);

        return (
            <div
                style={{
                    position: 'absolute',
                    left: mm(x + box.dx),
                    top: mm(y + box.dy),
                    width: mm(box.w),
                    height: mm(box.h),
                    overflow: 'hidden',
                }}
                data-icon-photo="filled"
                data-w={box.w}
                data-h={box.h}
            >
                <img
                    src={icon.photo.src}
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

    const name = icon?.preset ?? fallback;

    if (name !== null && name.startsWith('lucide:')) {
        return (
            <LucideArt
                id={name}
                x={x}
                y={y}
                size={size}
                color={color}
                strokeWidth={strokeWidth}
            />
        );
    }

    return name === null || !isIconName(name) ? null : (
        <Icon
            name={name}
            x={x}
            y={y}
            size={size}
            color={color}
            {...(strokeWidth === undefined ? {} : { strokeWidth })}
        />
    );
};

/**
 * A lucide drawing (B196), drawn like our own icons: lucide draws on a 24 grid inside a 2-unit margin, so the
 * view box is cut to its inner 20 x 20. That gives the same size and the same line width as an icon of our own
 * set, on screen and in the print. The drawing may run into the margin, so no line is cut off at the edge.
 */
const LucideArt = ({
    id,
    x,
    y,
    size,
    color,
    strokeWidth = 1.75,
}: {
    id: string;
    x: number;
    y: number;
    size: number;
    color: string;
    strokeWidth?: number | undefined;
}) => {
    const Drawing = LUCIDE_SPACE_ICONS[id];

    return Drawing === undefined ? null : (
        <Drawing
            style={{
                position: 'absolute',
                left: mm(x),
                top: mm(y),
                width: mm(size),
                height: mm(size),
                // Lines on the edge of the 20 x 20 cut (the foot of the beer, Niek 24 nov) would lose half their width.
                overflow: 'visible',
            }}
            viewBox="2 2 20 20"
            color={color}
            strokeWidth={strokeWidth}
            aria-hidden="true"
            data-icon={id}
        />
    );
};
