import { deedsFor } from '@/lib/game/standard-edition';

import { deedKey, spaceKey } from './keys';
import type { Edition, ElementOverride, PhotoPlacement } from './types';

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
        photo: spaceOverride.photo,
        photoStyle: own?.photoStyle ?? spaceOverride.photoStyle,
        from: 'space',
    };
}

/**
 * The edition with the photo of each space written onto its title deed where the deed shows it (B157). The print
 * job crops a photo per element, so the deed needs a placement of its own; the server does the same in
 * `PrintEditionData::fromArray`. Deeds with their own photo and spaces that keep theirs off are left alone.
 */
export function withDeedPhotos<T extends Pick<Edition, 'elements'>>(
    edition: T,
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
            photo: found.photo,
            ...(found.photoStyle === undefined
                ? {}
                : { photoStyle: found.photoStyle }),
        };
    });

    return elements === undefined ? edition : { ...edition, elements };
}
