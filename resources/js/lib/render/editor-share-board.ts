import {
    boardPropsOf,
    type BoardSources,
} from '@/components/render/board-props';
import { BOARD_CENTER_KEY } from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type {
    Edition,
    PhotoPlacement,
    PhotoRecord,
} from '@/lib/render/edition-types';

import { editorView } from './editor-print-selection';

/**
 * What "Deel je bord" sends (B228): the edition as the editor holds it, and a small copy of every photo on the board,
 * so the server draws the board as it is: names, words, colours and photos (R5-24). The picture is 1080 px wide with
 * the board at 880 px, so a space is about 60 px and the centre about 560 px: a photo goes at a few times that size,
 * more when it is zoomed in, and never more than 1400 px. Cards, money and the rest are not on the picture, so their
 * photos stay in the browser.
 */
export interface SharePhoto {
    id: string;
    /** A JPEG, or a PNG for a photo with see-through parts such as a logo, as a data URL. */
    src: string;
    width: number;
    height: number;
}

export interface ShareBoardRequest {
    edition: Edition;
    photos: SharePhoto[];
}

/** The long side of a photo on a space, in pixels, at zoom 1. */
const SPACE_PX = 360;
/** The long side of a photo in the centre or on a layer there, at zoom 1. */
const CENTRE_PX = 1000;
/** Never larger than this, whatever the zoom; the server takes up to 1.5 MB per photo. */
const MAX_PX = 1400;

/** The board's photo ids, with the long side each needs in the picture. */
export const sharePhotoSizes = (edition: Edition): Map<string, number> => {
    const sizes = new Map<string, number>();
    const need = (placement: PhotoPlacement | undefined, px: number) => {
        if (placement === undefined) {
            return;
        }
        const wanted = Math.min(
            MAX_PX,
            Math.round(px * Math.max(1, Math.min(placement.scale, 3))),
        );
        sizes.set(
            placement.photoId,
            Math.max(sizes.get(placement.photoId) ?? 0, wanted),
        );
    };
    // The same builder that draws the board tells which photos are on it, so nothing off the board goes along.
    const recorder: BoardSources = {
        photo: (key, placement) => {
            need(placement, key === BOARD_CENTER_KEY ? CENTRE_PX : SPACE_PX);

            return undefined;
        },
        icon: (_key, icon) => {
            if (icon !== undefined && 'photo' in icon) {
                need(icon.photo, SPACE_PX);
            }

            return undefined;
        },
        layers: (_key, layers) => {
            for (const layer of layers) {
                if (layer.kind === 'photo') {
                    need(layer.photo, CENTRE_PX);
                }
            }

            return [];
        },
    };

    boardPropsOf(resolveEdition(editorView(edition)), recorder);

    return sizes;
};

/** A photo made small in this browser: at most `longSide` px, a JPEG unless the original is a PNG. */
export type Shrink = (
    record: PhotoRecord,
    longSide: number,
) => Promise<Omit<SharePhoto, 'id'> | null>;

/** Draws the photo on a canvas at its new size; the browser turns it upright as it decodes it. */
const shrinkInBrowser: Shrink = async (record, longSide) => {
    if (
        typeof createImageBitmap === 'undefined' ||
        typeof document === 'undefined'
    ) {
        return null;
    }
    const png = record.blob.type === 'image/png';
    const bitmap = await createImageBitmap(record.preview ?? record.blob);
    const factor = Math.min(
        1,
        longSide / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * factor));
    const height = Math.max(1, Math.round(bitmap.height * factor));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (context === null) {
        bitmap.close();

        return null;
    }
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return {
        src: canvas.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85),
        width,
        height,
    };
};

/**
 * The request for the picture. A photo that is gone from this browser or cannot be drawn is left out: its place
 * stays empty on the picture, the rest still shows.
 */
export const shareBoardRequest = async (
    edition: Edition,
    getPhoto: (id: string) => Promise<PhotoRecord | undefined>,
    shrink: Shrink = shrinkInBrowser,
): Promise<ShareBoardRequest> => {
    const photos: SharePhoto[] = [];

    for (const [id, longSide] of sharePhotoSizes(edition)) {
        try {
            const record = await getPhoto(id);
            const small =
                record === undefined ? null : await shrink(record, longSide);
            if (small !== null) {
                photos.push({ id, ...small });
            }
        } catch {
            // One photo that does not decode does not cost the whole picture.
        }
    }

    return { edition, photos };
};
