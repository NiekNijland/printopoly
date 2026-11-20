import type { LocalEditionUpload } from './api';

/**
 * The edition of this browser with the photos it places, ready to upload for a job without an
 * account (B78, B80). The edition store (resources/js/lib/edition, IndexedDB) provides it once
 * that branch is merged; until then there is no local edition, and the print page says so.
 */
export function loadLocalEdition(
    editionId: string | null,
): Promise<LocalEditionUpload | null> {
    void editionId;

    return Promise.resolve(null);
}
