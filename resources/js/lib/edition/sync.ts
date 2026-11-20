import type { Locale } from '@/lib/game/types';
import { messages } from './strings';
import type { Edition, EditionSummary, PhotoRecord } from './types';

/** Editions per account (B70). Read from config on the server; this is the default for the question. */
export const ACCOUNT_EDITION_LIMIT = 20;

export interface RemoteEditionSummary {
    id: string;
    name: string;
    revision: number;
    updatedAt: number;
}

export type RemotePutResult =
    | { ok: true; revision: number }
    | { ok: false; reason: 'conflict'; current: RemoteEditionSummary }
    | { ok: false; reason: 'limit' };

/**
 * What the server offers once there is an account (B81). The network code comes later; the editor and the sync
 * question only depend on this interface.
 */
export interface RemoteEditionStore {
    list(): Promise<RemoteEditionSummary[]>;
    get(id: string): Promise<Edition | undefined>;
    /** Stores an edition when `expectedRevision` matches (`null` for a new one). */
    put(
        edition: Edition,
        expectedRevision: number | null,
    ): Promise<RemotePutResult>;
    putPhoto(photo: PhotoRecord): Promise<void>;
    delete(id: string): Promise<void>;
}

/** Local editions that the account does not have yet. */
export function findLocalOnly(
    local: readonly EditionSummary[],
    remote: readonly RemoteEditionSummary[],
): EditionSummary[] {
    const known = new Set(remote.map((edition) => edition.id));

    return local.filter((edition) => !known.has(edition.id));
}

/** Account editions this browser does not have: they come down as the local cache. */
export function findRemoteOnly(
    local: readonly EditionSummary[],
    remote: readonly RemoteEditionSummary[],
): RemoteEditionSummary[] {
    const known = new Set(local.map((edition) => edition.id));

    return remote.filter((edition) => !known.has(edition.id));
}

export interface SyncQuestion {
    count: number;
    editions: EditionSummary[];
    /** "Welkom, Niek. Je hebt 3 edities in deze browser." */
    title: string;
    /** "Wil je ze in je account bewaren? Dan zie je ze op elk apparaat waar je inlogt, …" */
    body: string;
    accept: string;
    decline: string;
    /** Set when not everything fits in the account: the user has to choose. */
    overLimit: { limit: number; room: number; message: string } | null;
}

export interface SyncQuestionOptions {
    locale: Locale;
    userName?: string;
    limit?: number;
}

/**
 * The one question after login (B81): "Je hebt 2 edities op dit apparaat. Wil je ze in je account bewaren?"
 * Returns `null` when there is nothing to ask.
 */
export function buildSyncQuestion(
    local: readonly EditionSummary[],
    remote: readonly RemoteEditionSummary[],
    options: SyncQuestionOptions,
): SyncQuestion | null {
    const editions = findLocalOnly(local, remote);
    if (editions.length === 0) {
        return null;
    }
    const m = messages[options.locale].sync;
    const limit = options.limit ?? ACCOUNT_EDITION_LIMIT;
    const room = Math.max(0, limit - remote.length);

    return {
        count: editions.length,
        editions,
        title: m.title(editions.length, options.userName),
        body: m.body(editions.length),
        accept: m.accept,
        decline: m.decline,
        overLimit:
            editions.length > room
                ? { limit, room, message: m.overLimit(limit) }
                : null,
    };
}

export interface UploadReport {
    uploaded: string[];
    /** Editions the server has with another revision: nothing is overwritten, the user chooses (B81). */
    conflicts: string[];
    /** Editions the account had no room for. */
    overLimit: string[];
}

/** Sends the chosen local editions and their photos to the account. Never overwrites an existing remote edition. */
export async function uploadEditions(
    ids: readonly string[],
    deps: {
        remote: RemoteEditionStore;
        getEdition(id: string): Promise<Edition | undefined>;
        listPhotos(editionId: string): Promise<PhotoRecord[]>;
    },
): Promise<UploadReport> {
    const report: UploadReport = { uploaded: [], conflicts: [], overLimit: [] };

    for (const id of ids) {
        const edition = await deps.getEdition(id);
        if (edition === undefined) {
            continue;
        }
        const result = await deps.remote.put(edition, null);
        if (!result.ok) {
            (result.reason === 'conflict'
                ? report.conflicts
                : report.overLimit
            ).push(id);
            continue;
        }
        for (const photo of await deps.listPhotos(id)) {
            await deps.remote.putPhoto(photo);
        }
        report.uploaded.push(id);
    }

    return report;
}
