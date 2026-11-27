import type { Locale } from '@/types/game';
import { messages } from '../../lib/render/edition-strings';
import type {
    Edition,
    EditionSummary,
    PhotoRecord,
} from '../../lib/render/edition-types';

/** Editions per account (B70). Read from config on the server; this is the default for the question. */
const ACCOUNT_EDITION_LIMIT = 20;

export type RemoteEditionSummary = {
    id: string;
    name: string;
    revision: number;
    updatedAt: number;
};

export type RemotePutResult =
    | { ok: true; revision: number }
    | { ok: false; reason: 'conflict'; current: RemoteEditionSummary }
    | { ok: false; reason: 'limit' };

/**
 * What the server offers once there is an account (B81). The network code comes later; the editor and the sync
 * question only depend on this interface.
 */
export type RemoteEditionStore = {
    list(): Promise<RemoteEditionSummary[]>;
    get(id: string): Promise<Edition | undefined>;
    /** Stores an edition when `expectedRevision` matches (`null` for a new one). */
    put(
        edition: Edition,
        expectedRevision: number | null,
    ): Promise<RemotePutResult>;
    putPhoto(photo: PhotoRecord): Promise<void>;
    delete(id: string): Promise<void>;
};

/** Local editions that the account does not have yet. */
const findLocalOnly = (
    local: readonly EditionSummary[],
    remote: readonly RemoteEditionSummary[],
): EditionSummary[] => {
    const known = new Set(remote.map((edition) => edition.id));

    return local.filter((edition) => !known.has(edition.id));
};

/** Account editions this browser does not have: they come down as the local cache. */
export const findRemoteOnly = (
    local: readonly EditionSummary[],
    remote: readonly RemoteEditionSummary[],
): RemoteEditionSummary[] => {
    const known = new Set(local.map((edition) => edition.id));

    return remote.filter((edition) => !known.has(edition.id));
};

export type SyncQuestion = {
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
};

export type SyncQuestionOptions = {
    locale: Locale;
    userName?: string;
    limit?: number;
};

/**
 * The one question after login (B81): "Je hebt 2 edities op dit apparaat. Wil je ze in je account bewaren?"
 * Returns `null` when there is nothing to ask.
 */
export const buildSyncQuestion = (
    local: readonly EditionSummary[],
    remote: readonly RemoteEditionSummary[],
    options: SyncQuestionOptions,
): SyncQuestion | null => {
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
};
