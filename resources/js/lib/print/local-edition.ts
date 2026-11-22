import { withDeedPhotos } from '@/lib/edition/deed-photos';
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

        // An uploaded icon (B136) is cropped when some set shows it.
        if (
            override.icon !== undefined &&
            'photo' in override.icon &&
            (`${key}#icon` in targets.printer || `${key}#icon` in targets.home)
        ) {
            ids.add(override.icon.photo.photoId);
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

/** The upload of an edition of this browser, with the edition itself. */
export type LocalEdition = LocalEditionUpload & { edition: Edition };

/**
 * The edition of this browser with the photos it shows, ready to upload for a job without an account (B78,
 * B80): the edition JSON, the original of every needed photo from IndexedDB, and the frame size of each
 * visible photo taken from the renderers. Returns `null` when there is no such edition in this browser.
 */
export async function loadLocalEdition(
    editionId: string | null,
    locale: Locale,
    storage: EditionStorage = getServices(locale).storage,
): Promise<LocalEdition | null> {
    const edition = await loadLocalEditionRecord(editionId, locale, storage);

    if (edition === undefined) {
        return null;
    }

    const targets = photoTargets(edition);
    const photos: Record<string, Blob> = {};
    const sizes = new Map<string, { width: number; height: number }>();

    for (const id of neededPhotoIds(withDeedPhotos(edition), targets)) {
        const record = await storage.getPhoto(id);

        if (record !== undefined) {
            photos[id] = record.blob;
            sizes.set(id, { width: record.width, height: record.height });
        }
    }

    // The deeds that borrow the photo of their space go up with the crop of their own frame, as the editor shows
    // them (B177); the server would otherwise give them the crop of the space.
    return {
        edition: withDeedPhotos(edition, sizes),
        photos,
        targets,
        // The language of the site, not of the edition: the instructions and file names follow it (B184).
        locale,
    };
}

function latest(editions: Edition[]): Edition | undefined {
    return [...editions].sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/**
 * Keeps the job that was just made for an edition of this browser next to it, so Mijn edities can say a set is
 * ready without an account (bug 14 of the integration check). Losing it only loses that line, so it never throws.
 */
export async function rememberPrintJob(
    edition: Edition,
    token: string,
    storage: EditionStorage,
    now: number = Date.now(),
): Promise<void> {
    try {
        await storage.addPrintJob({
            token,
            editionId: edition.id,
            revision: edition.revision,
            createdAt: now,
        });
    } catch {
        // Storage full or gone: the job itself is fine.
    }
}
