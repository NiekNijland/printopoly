import { applyEditionPatch } from './changes';
import { parseEdition } from './schema';
import type { EditionStorage, PatchResult } from './storage';
import type { Edition, EditionPatch, PhotoRecord } from './types';

export const DATABASE_NAME = 'printopoly';
export const DATABASE_VERSION = 1;
const EDITIONS = 'editions';
const PHOTOS = 'photos';

function request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () =>
            reject(req.error ?? new Error('IndexedDB request failed'));
    });
}

/** Resolves when the transaction has committed; rejects with the cause (for example `QuotaExceededError`). */
function done(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () =>
            reject(tx.error ?? new Error('IndexedDB transaction failed'));
        tx.onabort = () =>
            reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
}

/** Editions as plain objects and photos as Blobs in a separate object store, referenced by id. */
export class IndexedDbEditionStorage implements EditionStorage {
    private database: Promise<IDBDatabase> | null = null;

    constructor(
        private readonly factory: IDBFactory,
        private readonly name: string = DATABASE_NAME,
    ) {}

    private open(): Promise<IDBDatabase> {
        this.database ??= new Promise((resolve, reject) => {
            const req = this.factory.open(this.name, DATABASE_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                db.createObjectStore(EDITIONS, { keyPath: 'id' });
                db.createObjectStore(PHOTOS, { keyPath: 'id' }).createIndex(
                    'editionId',
                    'editionId',
                );
            };
            req.onsuccess = () => {
                const db = req.result;
                db.onversionchange = () => {
                    db.close();
                    this.database = null;
                };
                resolve(db);
            };
            req.onerror = () => {
                this.database = null;
                reject(req.error ?? new Error('Cannot open IndexedDB'));
            };
            req.onblocked = () => {
                this.database = null;
                reject(new Error('IndexedDB is blocked'));
            };
        });

        return this.database;
    }

    close(): void {
        void this.database?.then((db) => db.close());
        this.database = null;
    }

    async listEditions(): Promise<Edition[]> {
        const db = await this.open();
        const rows = await request<unknown[]>(
            db.transaction(EDITIONS).objectStore(EDITIONS).getAll(),
        );

        return rows.flatMap((row) => {
            const parsed = parseEdition(row);

            return parsed.ok ? [parsed.value] : [];
        });
    }

    async getEdition(id: string): Promise<Edition | undefined> {
        const db = await this.open();
        const row: unknown = await request(
            db.transaction(EDITIONS).objectStore(EDITIONS).get(id),
        );
        if (row === undefined) {
            return undefined;
        }
        const parsed = parseEdition(row);
        if (!parsed.ok) {
            throw new Error(
                `Edition ${id} is not valid: ${parsed.errors.join('; ')}`,
            );
        }

        return parsed.value;
    }

    async createEdition(edition: Edition): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(EDITIONS, 'readwrite');
        tx.objectStore(EDITIONS).add(edition);
        await done(tx);
    }

    async applyPatch(
        id: string,
        patch: EditionPatch,
        now: number,
    ): Promise<PatchResult> {
        const db = await this.open();
        const tx = db.transaction(EDITIONS, 'readwrite');
        const store = tx.objectStore(EDITIONS);
        const row: unknown = await request(store.get(id));
        const parsed = row === undefined ? undefined : parseEdition(row);

        if (parsed === undefined) {
            tx.abort();
            return { ok: false, reason: 'missing' };
        }
        if (!parsed.ok) {
            tx.abort();
            throw new Error(
                `Edition ${id} is not valid: ${parsed.errors.join('; ')}`,
            );
        }
        if (parsed.value.revision !== patch.baseRevision) {
            tx.abort();
            return { ok: false, reason: 'conflict', current: parsed.value };
        }
        const next = applyEditionPatch(parsed.value, patch, now);
        store.put(next);
        await done(tx);

        return { ok: true, edition: next };
    }

    async deleteEdition(id: string): Promise<void> {
        const db = await this.open();
        const tx = db.transaction([EDITIONS, PHOTOS], 'readwrite');
        tx.objectStore(EDITIONS).delete(id);
        const photos = tx.objectStore(PHOTOS);
        const keys = await request(photos.index('editionId').getAllKeys(id));
        for (const key of keys) {
            photos.delete(key);
        }
        await done(tx);
    }

    async putPhoto(photo: PhotoRecord): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(PHOTOS, 'readwrite');
        tx.objectStore(PHOTOS).put(photo);
        await done(tx);
    }

    async getPhoto(id: string): Promise<PhotoRecord | undefined> {
        const db = await this.open();

        const photo: PhotoRecord | undefined = await request(
            db.transaction(PHOTOS).objectStore(PHOTOS).get(id) as IDBRequest<
                PhotoRecord | undefined
            >,
        );

        return photo;
    }

    async listPhotos(editionId: string): Promise<PhotoRecord[]> {
        const db = await this.open();

        const photos: PhotoRecord[] = await request(
            db
                .transaction(PHOTOS)
                .objectStore(PHOTOS)
                .index('editionId')
                .getAll(editionId) as IDBRequest<PhotoRecord[]>,
        );

        return photos;
    }

    async deletePhotos(ids: readonly string[]): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(PHOTOS, 'readwrite');
        for (const id of ids) {
            tx.objectStore(PHOTOS).delete(id);
        }
        await done(tx);
    }
}
