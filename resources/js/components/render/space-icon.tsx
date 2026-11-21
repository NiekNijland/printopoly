import { photoLayout, type PhotoSource } from '@/lib/render/photo';
import type { SpaceIconPreset } from '@/lib/render/space-icons';
import { mm } from '@/lib/render/units';

import { Icon, type IconName } from './icons';

/** The image of a special space as the renderers take it (B136): one of our icons, or an uploaded image. */
export type SpaceIconSource =
    | { preset: SpaceIconPreset }
    | {
          photo: PhotoSource;
          /** Width over height of the image, so it is drawn whole inside the icon box. */
          aspect: number;
      };

export interface SpaceIconArtProps {
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
}

/** The box an image of this shape takes inside a square of `size`, centred. */
export function containedBox(
    aspect: number,
    size: number,
): { dx: number; dy: number; w: number; h: number } {
    const safe = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    const w = safe >= 1 ? size : size * safe;
    const h = safe >= 1 ? size / safe : size;

    return { dx: (size - w) / 2, dy: (size - h) / 2, w, h };
}

/**
 * The icon of a special space: a chosen icon in the line of the theme, or an uploaded image drawn whole
 * (transparent parts stay transparent). The image box carries `data-icon-photo` so the print pipeline can
 * measure the size it is cropped to (lib/print/photo-targets.ts).
 */
export function SpaceIconArt({
    icon,
    fallback,
    x,
    y,
    size,
    color,
    strokeWidth,
}: SpaceIconArtProps) {
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

    return name === null ? null : (
        <Icon
            name={name}
            x={x}
            y={y}
            size={size}
            color={color}
            {...(strokeWidth === undefined ? {} : { strokeWidth })}
        />
    );
}
