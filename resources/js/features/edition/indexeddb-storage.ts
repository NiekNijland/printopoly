import { applyEditionPatch } from '../../lib/render/edition-changes';
import { migrateElements } from '../../lib/render/edition-schema';
import {
    CorruptEditionError,
    surplusPrintJobs,
    type EditionStorage,
    type PatchResult,
} from '../../lib/render/edition-storage';
import type {
    Edition,
    EditionPatch,
    PhotoRecord,
    PrintJobRecord,
} from '../../lib/render/edition-types';
import { isJsonObject } from './remote/client';
import { readStoredEdition } from './repair';

/**
 * A stored edition, repaired when it breaks a rule (round 4, bug 1): it opens instead of being refused, and the
 * repair is logged. `undefined` only for a row that cannot be read at all.
 */
const readRow = (row: unknown): Edition | undefined => {
    const read = readStoredEdition(row);
    if (read !== undefined && read.repaired.length > 0) {
        console.warn(
            `Edition ${read.edition.id} was repaired on read: ${read.repaired.join('; ')}`,
        );
    }

    return read?.edition;
};

const isPhotoRecord = (value: unknown): value is PhotoRecord =>
    isJsonObject(value) &&
    typeof value.id === 'string' &&
    typeof value.editionId === 'string' &&
    value.blob instanceof Blob &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    typeof value.createdAt === 'number';

const isPrintJobRecord = (value: unknown): value is PrintJobRecord =>
    isJsonObject(value) &&
    typeof value.token === 'string' &&
    typeof value.editionId === 'string' &&
    typeof value.revision === 'number' &&
    typeof value.createdAt === 'number';

const DATABASE_NAME = 'printopoly';
/**
 * 2: the bank name moved into the words of the edition (B148), so stored editions are rewritten once.
 * 3: the print jobs of an edition without an account are kept next to it (bug 14 of the integration check).
 */
const DATABASE_VERSION = 3;
const EDITIONS = 'editions';
const PHOTOS = 'photos';
const PRINT_JOBS = 'printJobs';

const request = <T>(req: IDBRequest<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () =>
            reject(req.error ?? new Error('IndexedDB request failed'));
    });
};

/** Resolves when the transaction has committed; rejects with the cause (for example `QuotaExceededError`). */
const done = (tx: IDBTransaction): Promise<void> => {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () =>
            reject(tx.error ?? new Error('IndexedDB transaction failed'));
        tx.onabort = () =>
            reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
};

/**
 * Rewrites stored editions whose elements use a key that has moved (B148). Reading migrates as well, so this only
 * makes the stored copy match; the revision stays, because the edition means the same.
 */
const migrateStoredEditions = (tx: IDBTransaction | null): void => {
    const cursorRequest = tx?.objectStore(EDITIONS).openCursor();
    if (cursorRequest === undefined) {
        return;
    }
    cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor === null) {
            return;
        }
        const row: unknown = cursor.value;
        if (typeof row === 'object' && row !== null && 'elements' in row) {
            const elements = migrateElements(row.elements);
            if (elements !== row.elements) {
                cursor.update({ ...row, elements });
            }
        }
        cursor.continue();
    };
};

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
            req.onupgradeneeded = (event) => {
                const db = req.result;
                if (event.oldVersion < 1) {
                    db.createObjectStore(EDITIONS, { keyPath: 'id' });
                    db.createObjectStore(PHOTOS, { keyPath: 'id' }).createIndex(
                        'editionId',
                        'editionId',
                    );
                }
                if (event.oldVersion >= 1 && event.oldVersion < 2) {
                    migrateStoredEditions(req.transaction);
                }
                if (event.oldVersion < 3) {
                    db.createObjectStore(PRINT_JOBS, {
                        keyPath: 'token',
                    }).createIndex('editionId', 'editionId');
                }
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
            const read = readRow(row);

            return read === undefined ? [] : [read];
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
        const read = readRow(row);
        if (read === undefined) {
            throw new CorruptEditionError(id, ['cannot be repaired']);
        }

        return read;
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
        if (row === undefined) {
            tx.abort();
            return { ok: false, reason: 'missing' };
        }
        // A repaired edition is written back with the patch, so the repair sticks.
        const current = readRow(row);
        if (current === undefined) {
            tx.abort();
            throw new CorruptEditionError(id, ['cannot be repaired']);
        }
        if (current.revision !== patch.baseRevision) {
            tx.abort();
            return { ok: false, reason: 'conflict', current };
        }
        const next = applyEditionPatch(current, patch, now);
        store.put(next);
        await done(tx);

        return { ok: true, edition: next };
    }

    async deleteEdition(id: string): Promise<void> {
        const db = await this.open();
        const tx = db.transaction([EDITIONS, PHOTOS, PRINT_JOBS], 'readwrite');
        tx.objectStore(EDITIONS).delete(id);
        for (const name of [PHOTOS, PRINT_JOBS]) {
            const store = tx.objectStore(name);
            const keys = await request(store.index('editionId').getAllKeys(id));
            for (const key of keys) {
                store.delete(key);
            }
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

        const photo: unknown = await request(
            db.transaction(PHOTOS).objectStore(PHOTOS).get(id),
        );

        return isPhotoRecord(photo) ? photo : undefined;
    }

    async listPhotos(editionId: string): Promise<PhotoRecord[]> {
        const db = await this.open();

        const photos: unknown = await request(
            db
                .transaction(PHOTOS)
                .objectStore(PHOTOS)
                .index('editionId')
                .getAll(editionId),
        );

        return Array.isArray(photos) ? photos.filter(isPhotoRecord) : [];
    }

    async deletePhotos(ids: readonly string[]): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(PHOTOS, 'readwrite');
        for (const id of ids) {
            tx.objectStore(PHOTOS).delete(id);
        }
        await done(tx);
    }

    async addPrintJob(job: PrintJobRecord): Promise<void> {
        const db = await this.open();
        const tx = db.transaction(PRINT_JOBS, 'readwrite');
        const store = tx.objectStore(PRINT_JOBS);
        store.put(job);
        const own: unknown = await request(
            store.index('editionId').getAll(job.editionId),
        );
        for (const old of surplusPrintJobs(
            Array.isArray(own) ? own.filter(isPrintJobRecord) : [],
        )) {
            store.delete(old.token);
        }
        await done(tx);
    }

    async listPrintJobs(): Promise<PrintJobRecord[]> {
        const db = await this.open();

        const jobs: unknown = await request(
            db.transaction(PRINT_JOBS).objectStore(PRINT_JOBS).getAll(),
        );

        return Array.isArray(jobs) ? jobs.filter(isPrintJobRecord) : [];
    }
}
