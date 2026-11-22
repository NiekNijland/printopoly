import { deedsFor } from '@/lib/game/standard-edition';
import { faceHeight } from '@/lib/photos/transform';

import { deedKey, spaceKey } from './keys';
import type { Edition, ElementOverride, PhotoPlacement } from './types';

/**
 * The photo frame of a title deed in mm, under the coloured block (B124, B133). It is 16.5 mm high since R5-05: at
 * 12.5 mm a photo was a thin band that cut faces off. `TitleDeed` draws it with these numbers.
 */
export const DEED_PHOTO = { top: 22.5, bottom: 39, w: 54 } as const;

/**
 * The strip of a photo over the full width of the deed (B253): from right under the block to the table, and 3 mm
 * into the bleed on both sides of the 63 mm card.
 */
export const DEED_FULL_PHOTO = { top: 21, bottom: 39, w: 69 } as const;

/**
 * The crop of a borrowed photo on its title deed (B177, B253). The deed frame is a strip about three to four times
 * as wide as it is high. Every photo fills it, landscape or standing (Kees in round 6: a standing photo that fitted
 * became a small square with paper beside it). Left in the middle of the photo, the strip showed a band across the
 * middle; an untouched photo shows the upper part instead, with the face line a third down the strip (R5-05). A crop
 * someone moved on the space stays as it is, and a photo of unknown size keeps the crop of the space.
 */
export function deedCrop(
    photo: PhotoPlacement,
    size: { width: number; height: number } | undefined,
    style: ElementOverride['photoStyle'],
): PhotoPlacement {
    const { borrowed: _borrowed, ...placement } = photo;
    // A photo that fits on its space (a logo, B168) fits on the deed too.
    if (
        size === undefined ||
        placement.fit === true ||
        size.width <= 0 ||
        size.height <= 0
    ) {
        return placement;
    }
    const turned = Math.round(placement.rotation / 90) % 2 !== 0;
    const width = turned ? size.height : size.width;
    const height = turned ? size.width : size.height;
    const strip = style === 'full' ? DEED_FULL_PHOTO : DEED_PHOTO;
    // A standing photo starts on its space with the face line set for that frame, so at 100% it always gets the
    // crop of the strip; a landscape photo only while it is in the middle.
    const untouched =
        placement.scale === 1 && (placement.cy === 0.5 || height > width);
    return {
        ...placement,
        ...(untouched
            ? {
                  cx: 0.5,
                  cy: faceHeight(
                      { w: width, h: height },
                      { w: strip.w, h: strip.bottom - strip.top },
                  ),
              }
            : {}),
    };
}

/** The photo a title deed shows, and where it comes from. */
export interface DeedPhoto {
    photo: PhotoPlacement;
    photoStyle: ElementOverride['photoStyle'];
    /** `deed` when the deed has a photo of its own, `space` when it shows the photo of its space (B157). */
    from: 'deed' | 'space';
}

/**
 * The photo of title deed `index` (1 to 28): its own photo, or else the photo of its street, station or utility,
 * unless the space keeps its photo off the deed (B157). A deed with its own photo keeps it, so editions that
 * set one before B157 do not change.
 */
export function deedPhotoOf(
    edition: Pick<Edition, 'elements'>,
    index: number,
): DeedPhoto | undefined {
    const own = edition.elements[deedKey(index)];

    if (own?.photo !== undefined) {
        return { photo: own.photo, photoStyle: own.photoStyle, from: 'deed' };
    }

    const space = deedsFor()[index - 1];
    const spaceOverride =
        space === undefined
            ? undefined
            : edition.elements[spaceKey(space.position)];

    if (
        spaceOverride?.photo === undefined ||
        spaceOverride.deedPhoto === false
    ) {
        return undefined;
    }

    return {
        photo: { ...spaceOverride.photo, borrowed: true },
        photoStyle: own?.photoStyle ?? spaceOverride.photoStyle,
        from: 'space',
    };
}

/**
 * The edition with the photo of each space written onto its title deed where the deed shows it (B157). The print
 * job crops a photo per element, so the deed needs a placement of its own; the server does the same in
 * `PrintEditionData::fromArray` for an edition that comes without them. With the sizes of the photos the deed
 * gets the crop of its own frame (B177), so the print matches the editor. Deeds with their own photo and spaces
 * that keep theirs off are left alone.
 */
export function withDeedPhotos<T extends Pick<Edition, 'elements'>>(
    edition: T,
    /** Pixel sizes by photo id: with them each deed gets its own crop (B177), as the editor shows it. */
    sizes?: ReadonlyMap<string, { width: number; height: number }>,
): T {
    let elements: Edition['elements'] | undefined;

    deedsFor().forEach((_, i) => {
        const found = deedPhotoOf(edition, i + 1);

        if (found?.from !== 'space') {
            return;
        }

        elements ??= { ...edition.elements };
        const key = deedKey(i + 1);
        elements[key] = {
            ...elements[key],
            photo: deedCrop(
                found.photo,
                sizes?.get(found.photo.photoId),
                found.photoStyle,
            ),
            ...(found.photoStyle === undefined
                ? {}
                : { photoStyle: found.photoStyle }),
        };
    });

    return elements === undefined ? edition : { ...edition, elements };
}
