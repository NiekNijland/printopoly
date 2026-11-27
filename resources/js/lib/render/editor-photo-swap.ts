import { setElement } from '@/lib/render/edition-changes';
import { parseKey, spaceKey } from '@/lib/render/edition-keys';
import type {
    Edition,
    ElementChange,
    ElementOverride,
} from '@/lib/render/edition-types';
import { holdsPhoto } from '@/lib/render/editor-catalogue';
import { photoKindOf } from '@/lib/render/editor-photo-batch';
import { standardEdition } from '@/lib/render/standard-edition';

/**
 * Photos between spaces (B238, Sem in ronde 6): after eight photos at once two of them sat on each other's space.
 * "Foto wisselen met…" trades the photos of two spaces, or moves one to a space without a photo, and leaves the
 * names, amounts and title deeds where they are. Streets, stations and utilities take part, in any mix: a photo
 * is not bound to a kind of space.
 */

/** Whether a space can give or take a photo in a swap: a street, a station or a utility. */
export const swapsPhoto = (key: string): boolean => {
    return (
        parseKey(key)?.kind === 'space' &&
        holdsPhoto(key) &&
        photoKindOf(key) !== null
    );
};

/** The spaces the photo of `key` can go to, in board order. */
export const photoSwapTargets = (key: string): string[] => {
    if (!swapsPhoto(key)) {
        return [];
    }

    return standardEdition.spaces
        .map((space) => spaceKey(space.position))
        .filter((other) => other !== key && swapsPhoto(other));
};

/** Whether `key` has a photo that can move to another space. */
export const canSwapPhoto = (edition: Edition, key: string): boolean => {
    return swapsPhoto(key) && edition.elements[key]?.photo !== undefined;
};

/** `override` with the photo (and how it stands, B124) of `from` instead of its own. */
const withPhotoOf = (
    override: ElementOverride | undefined,
    from: ElementOverride | undefined,
): ElementOverride | undefined => {
    const { photo: _photo, photoStyle: _style, ...rest } = override ?? {};
    const next: ElementOverride = { ...rest };
    if (from?.photo !== undefined) {
        next.photo = from.photo;
        if (from.photoStyle !== undefined) {
            next.photoStyle = from.photoStyle;
        }
        // A photo takes the place of an own icon on a station or utility (B136): a space shows one picture.
        delete next.icon;
    }

    return Object.keys(next).length === 0 ? undefined : next;
};

/**
 * The changes that trade the photos of `a` and `b`, or move the photo of `a` to `b` when `b` has none. Both
 * changes go to the session in one `apply`, so they are one undo step.
 */
export const photoSwapChanges = (
    edition: Edition,
    a: string,
    b: string,
): ElementChange[] => {
    if (a === b || !swapsPhoto(a) || !swapsPhoto(b)) {
        return [];
    }
    const first = edition.elements[a];
    const second = edition.elements[b];
    if (first?.photo === undefined && second?.photo === undefined) {
        return [];
    }

    return [
        setElement(edition, a, withPhotoOf(first, second)).change,
        setElement(edition, b, withPhotoOf(second, first)).change,
    ].filter((change) => change !== null);
};
