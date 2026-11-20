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
    applyPatch(
        id: string,
        patch: EditionPatch,
        now: number,
    ): Promise<PatchResult>;
    /** Removes the edition and its photos together. */
    deleteEdition(id: string): Promise<void>;
    putPhoto(photo: PhotoRecord): Promise<void>;
    getPhoto(id: string): Promise<PhotoRecord | undefined>;
    listPhotos(editionId: string): Promise<PhotoRecord[]>;
    deletePhotos(ids: readonly string[]): Promise<void>;
}

/** A stored edition that no longer passes the schema. Only that edition is lost; the rest keeps working. */
export class CorruptEditionError extends Error {
    constructor(id: string, problems: readonly string[]) {
        super(`Edition ${id} is not valid: ${problems.join('; ')}`);
        this.name = 'CorruptEditionError';
    }
}

export function isCorruptError(error: unknown): boolean {
    return error instanceof CorruptEditionError;
}

/** True for the error browsers throw when storage is full. */
export function isQuotaError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const { name, code } = error as { name?: unknown; code?: unknown };

    return (
        name === 'QuotaExceededError' ||
        name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        code === 22 ||
        code === 1014
    );
}

export class MemoryEditionStorage implements EditionStorage {
    private readonly editions = new Map<string, Edition>();
    private readonly photos = new Map<string, PhotoRecord>();
    /** Set to make every write fail, for example with a quota error. */
    writeError: Error | null = null;

    /** Runs `action` and wraps the outcome in a promise, so a throw becomes a rejection. */
    private run<T>(action: () => T): Promise<T> {
        return new Promise((resolve) => {
            resolve(action());
        });
    }

    private assertWritable(): void {
        if (this.writeError !== null) {
            throw this.writeError;
        }
    }

    listEditions(): Promise<Edition[]> {
        return this.run(() => {
            return [...this.editions.values()].map((edition) =>
                structuredClone(edition),
            );
        });
    }

    getEdition(id: string): Promise<Edition | undefined> {
        return this.run(() => {
            const edition = this.editions.get(id);

            return edition === undefined ? undefined : structuredClone(edition);
        });
    }

    createEdition(edition: Edition): Promise<void> {
        return this.run(() => {
            this.assertWritable();
            if (this.editions.has(edition.id)) {
                throw new Error(`Edition ${edition.id} already exists`);
            }
            this.editions.set(edition.id, structuredClone(edition));
        });
    }

    applyPatch(
        id: string,
        patch: EditionPatch,
        now: number,
    ): Promise<PatchResult> {
        return this.run(() => {
            this.assertWritable();
            const current = this.editions.get(id);
            if (current === undefined) {
                return { ok: false, reason: 'missing' };
            }
            if (current.revision !== patch.baseRevision) {
                return {
                    ok: false,
                    reason: 'conflict',
                    current: structuredClone(current),
                };
            }
            const next = applyEditionPatch(current, patch, now);
            this.editions.set(id, structuredClone(next));

            return { ok: true, edition: next };
        });
    }

    deleteEdition(id: string): Promise<void> {
        return this.run(() => {
            this.assertWritable();
            this.editions.delete(id);
            for (const photo of [...this.photos.values()]) {
                if (photo.editionId === id) {
                    this.photos.delete(photo.id);
                }
            }
        });
    }

    putPhoto(photo: PhotoRecord): Promise<void> {
        return this.run(() => {
            this.assertWritable();
            this.photos.set(photo.id, photo);
        });
    }

    getPhoto(id: string): Promise<PhotoRecord | undefined> {
        return this.run(() => {
            return this.photos.get(id);
        });
    }

    listPhotos(editionId: string): Promise<PhotoRecord[]> {
        return this.run(() => {
            return [...this.photos.values()].filter(
                (photo) => photo.editionId === editionId,
            );
        });
    }

    deletePhotos(ids: readonly string[]): Promise<void> {
        return this.run(() => {
            this.assertWritable();
            for (const id of ids) {
                this.photos.delete(id);
            }
        });
    }
}
