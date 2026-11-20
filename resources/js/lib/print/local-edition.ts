import type { EditionStorage } from '@/lib/edition/storage';
import type { Edition } from '@/lib/edition/types';
import { getServices } from '@/lib/editor/services';
import type { Locale } from '@/lib/game/types';

import type { LocalEditionUpload } from './api';
import { photoTargets, type PhotoTargets } from './photo-targets';

/** The ids of the photos a job needs: those that show in some set, and the photos on free layers. */
export function neededPhotoIds(
    edition: Edition,
    targets: PhotoTargets,
): string[] {
    const ids = new Set<string>();

    for (const [key, override] of Object.entries(edition.elements)) {
        const shown =
            `${key}#photo` in targets.printer || `${key}#photo` in targets.home;

        if (override.photo !== undefined && shown) {
            ids.add(override.photo.photoId);
        }

        if (
            override.background !== undefined &&
            `${key}#background` in targets.printer
        ) {
            ids.add(override.background.photoId);
        }

        for (const layer of override.layers ?? []) {
            if (layer.kind === 'photo') {
                ids.add(layer.photo.photoId);
            }
        }
    }

    return [...ids];
}

/**
 * The edition of this browser. With no id the most recently changed edition is taken, so "/print" works
 * for whoever has one.
 */
export async function loadLocalEditionRecord(
    editionId: string | null,
    locale: Locale,
    storage: EditionStorage = getServices(locale).storage,
): Promise<Edition | undefined> {
    return editionId === null
        ? latest(await storage.listEditions())
        : storage.getEdition(editionId);
}

/**
 * The edition of this browser with the photos it shows, ready to upload for a job without an account (B78,
 * B80): the edition JSON, the original of every needed photo from IndexedDB, and the frame size of each
 * visible photo taken from the renderers. Returns `null` when there is no such edition in this browser.
 */
export async function loadLocalEdition(
    editionId: string | null,
    locale: Locale,
    storage: EditionStorage = getServices(locale).storage,
): Promise<LocalEditionUpload | null> {
    const edition = await loadLocalEditionRecord(editionId, locale, storage);

    if (edition === undefined) {
        return null;
    }

    const targets = photoTargets(edition);
    const photos: Record<string, Blob> = {};

    for (const id of neededPhotoIds(edition, targets)) {
        const record = await storage.getPhoto(id);

        if (record !== undefined) {
            photos[id] = record.blob;
        }
    }

    return { edition, photos, targets, locale: edition.language };
}

function latest(editions: Edition[]): Edition | undefined {
    return [...editions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
}
