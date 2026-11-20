import { applyEditionPatch } from './changes';
import type { Edition, EditionPatch, PhotoRecord } from './types';

export type PatchResult =
    | { ok: true; edition: Edition }
    | { ok: false; reason: 'conflict'; current: Edition }
    | { ok: false; reason: 'missing' };

/**
 * What the repository needs from the browser. `IndexedDbEditionStorage` is the real one, `MemoryEditionStorage` is
 * for tests and for browsers without IndexedDB.
 */
export interface EditionStorage {
    listEditions(): Promise<Edition[]>;
    getEdition(id: string): Promise<Edition | undefined>;
    /** Throws when an edition with this id exists. */
    createEdition(edition: Edition): Promise<void>;
    /**
     * Applies a patch only when `patch.baseRevision` equals the stored revision, atomically. Stores only the changed
     * elements and bumps the revision (B60).
     */
    applyPatch(id: string, patch: EditionPatch, now: number): Promise<PatchResult>;
    /** Removes the edition and its photos together. */
    deleteEdition(id: string): Promise<void>;
    putPhoto(photo: PhotoRecord): Promise<void>;
    getPhoto(id: string): Promise<PhotoRecord | undefined>;
    listPhotos(editionId: string): Promise<PhotoRecord[]>;
    deletePhotos(ids: readonly string[]): Promise<void>;
}

/** True for the error browsers throw when storage is full. */
export function isQuotaError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const { name, code } = error as { name?: unknown; code?: unknown };

    return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014;
}

export class MemoryEditionStorage implements EditionStorage {
    private readonly editions = new Map<string, Edition>();
    private readonly photos = new Map<string, PhotoRecord>();
    /** Set to make every write fail, for example with a quota error. */
    writeError: Error | null = null;

    private assertWritable(): void {
        if (this.writeError !== null) {
            throw this.writeError;
        }
    }

    async listEditions(): Promise<Edition[]> {
        return [...this.editions.values()].map((edition) => structuredClone(edition));
    }

    async getEdition(id: string): Promise<Edition | undefined> {
        const edition = this.editions.get(id);

        return edition === undefined ? undefined : structuredClone(edition);
    }

    async createEdition(edition: Edition): Promise<void> {
        this.assertWritable();
        if (this.editions.has(edition.id)) {
            throw new Error(`Edition ${edition.id} already exists`);
        }
        this.editions.set(edition.id, structuredClone(edition));
    }

    async applyPatch(id: string, patch: EditionPatch, now: number): Promise<PatchResult> {
        this.assertWritable();
        const current = this.editions.get(id);
        if (current === undefined) {
            return { ok: false, reason: 'missing' };
        }
        if (current.revision !== patch.baseRevision) {
            return { ok: false, reason: 'conflict', current: structuredClone(current) };
        }
        const next = applyEditionPatch(current, patch, now);
        this.editions.set(id, structuredClone(next));

        return { ok: true, edition: next };
    }

    async deleteEdition(id: string): Promise<void> {
        this.assertWritable();
        this.editions.delete(id);
        for (const photo of [...this.photos.values()]) {
            if (photo.editionId === id) {
                this.photos.delete(photo.id);
            }
        }
    }

    async putPhoto(photo: PhotoRecord): Promise<void> {
        this.assertWritable();
        this.photos.set(photo.id, photo);
    }

    async getPhoto(id: string): Promise<PhotoRecord | undefined> {
        return this.photos.get(id);
    }

    async listPhotos(editionId: string): Promise<PhotoRecord[]> {
        return [...this.photos.values()].filter((photo) => photo.editionId === editionId);
    }

    async deletePhotos(ids: readonly string[]): Promise<void> {
        this.assertWritable();
        for (const id of ids) {
            this.photos.delete(id);
        }
    }
}
