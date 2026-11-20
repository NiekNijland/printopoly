import { parseEdition } from '../schema';
import type {
    RemoteEditionStore,
    RemoteEditionSummary,
    RemotePutResult,
} from '../sync';
import type { Edition, EditionPatch, PhotoRecord } from '../types';
import {
    RemoteApiError,
    createApiClient,
    isJsonObject,
    type ApiClient,
    type ApiResponse,
} from './client';

/** What the server says after a patch, a replace or a rename. */
export type RemoteChangeResult =
    | { ok: true; revision: number; updatedAt: number }
    | { ok: false; reason: 'conflict'; current: Edition }
    | { ok: false; reason: 'missing' };

export type RemoteDuplicateResult =
    | { ok: true; edition: Edition }
    | { ok: false; reason: 'limit'; limit: number }
    | { ok: false; reason: 'missing' };

/** What the after-login import did, per edition id (B81). */
export interface RemoteImportReport {
    imported: string[];
    /** The account already has an edition with this id; nothing was overwritten. */
    conflicts: string[];
    overLimit: string[];
    /** Messages per edition id. */
    invalid: Record<string, string[]>;
}

export interface RemoteEditionList {
    editions: RemoteEditionSummary[];
    /** Editions an account may hold (B70). */
    limit: number;
}

export interface RemoteEditionStoreOptions {
    client?: ApiClient;
    /**
     * Uploads one photo to the account. Photos live in the assets of the print pipeline, which is not part of the
     * edition sync, so this is a hook: without it `putPhoto` does nothing.
     */
    uploadPhoto?: (photo: PhotoRecord) => Promise<void>;
}

/** The store, with the calls the editor needs next to what `sync.ts` asks for. */
export interface AccountEditionStore extends RemoteEditionStore {
    listWithLimit(): Promise<RemoteEditionList>;
    /** Autosave: only the changed settings and elements, against `patch.baseRevision` (B60). */
    patch(id: string, patch: EditionPatch): Promise<RemoteChangeResult>;
    rename(
        id: string,
        name: string,
        baseRevision: number,
    ): Promise<RemoteChangeResult>;
    duplicate(id: string, name?: string): Promise<RemoteDuplicateResult>;
    /** Sends the editions the user chose to keep in the account. Never overwrites. */
    importEditions(editions: readonly Edition[]): Promise<RemoteImportReport>;
}

function fail(response: ApiResponse): never {
    throw new RemoteApiError(response.status, response.body);
}

function readEdition(value: unknown): Edition {
    const parsed = parseEdition(value);
    if (!parsed.ok) {
        throw new Error(
            `The server sent an invalid edition: ${parsed.errors.join('; ')}`,
        );
    }

    return parsed.value;
}

function readStrings(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

function readNumber(body: unknown, key: string): number {
    if (isJsonObject(body) && typeof body[key] === 'number') {
        return body[key];
    }
    throw new Error(`The server answer has no number "${key}".`);
}

function summaryOf(edition: Edition): RemoteEditionSummary {
    return {
        id: edition.id,
        name: edition.name,
        revision: edition.revision,
        updatedAt: edition.updatedAt,
    };
}

function readSummary(value: unknown): RemoteEditionSummary {
    if (
        isJsonObject(value) &&
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.revision === 'number' &&
        typeof value.updatedAt === 'number'
    ) {
        return {
            id: value.id,
            name: value.name,
            revision: value.revision,
            updatedAt: value.updatedAt,
        };
    }
    throw new Error('The server sent an invalid edition summary.');
}

function readCurrent(response: ApiResponse): Edition {
    return readEdition(
        isJsonObject(response.body) ? response.body.current : undefined,
    );
}

function isLimitError(body: unknown): body is { limit: number } {
    return (
        isJsonObject(body) &&
        body.code === 'edition_limit' &&
        typeof body.limit === 'number'
    );
}

function changeResult(response: ApiResponse): RemoteChangeResult {
    if (response.status === 200) {
        return {
            ok: true,
            revision: readNumber(response.body, 'revision'),
            updatedAt: readNumber(response.body, 'updatedAt'),
        };
    }
    if (response.status === 409) {
        return {
            ok: false,
            reason: 'conflict',
            current: readCurrent(response),
        };
    }
    if (response.status === 404) {
        return { ok: false, reason: 'missing' };
    }

    return fail(response);
}

const path = (id: string) => `/api/editions/${encodeURIComponent(id)}`;

/**
 * The `RemoteEditionStore` of `sync.ts` on top of the JSON API (B60, B81). Conflicts come back as values, never as
 * overwrites: the server answers 409 with its own version and the caller lets the user choose. Network failures reject
 * with the original error; 401 and 419 throw `RemoteAuthError`, 429 `RemoteRateLimitError`.
 */
export function createRemoteEditionStore(
    options: RemoteEditionStoreOptions = {},
): AccountEditionStore {
    const client = options.client ?? createApiClient();

    async function listWithLimit(): Promise<RemoteEditionList> {
        const response = await client.request('GET', '/api/editions');
        if (!response.ok || !isJsonObject(response.body)) {
            return fail(response);
        }
        const editions = Array.isArray(response.body.editions)
            ? (response.body.editions as unknown[]).map(readSummary)
            : [];

        return { editions, limit: readNumber(response.body, 'limit') };
    }

    return {
        listWithLimit,

        async list() {
            return (await listWithLimit()).editions;
        },

        async get(id) {
            const response = await client.request('GET', path(id));
            if (response.status === 404) {
                return undefined;
            }
            if (!response.ok || !isJsonObject(response.body)) {
                return fail(response);
            }

            return readEdition(response.body.edition);
        },

        async put(edition, expectedRevision): Promise<RemotePutResult> {
            const response =
                expectedRevision === null
                    ? await client.request('POST', '/api/editions', edition)
                    : await client.request('PUT', path(edition.id), {
                          ...edition,
                          baseRevision: expectedRevision,
                      });

            if (response.status === 201 || response.status === 200) {
                return {
                    ok: true,
                    revision:
                        response.status === 201 && isJsonObject(response.body)
                            ? readEdition(response.body.edition).revision
                            : readNumber(response.body, 'revision'),
                };
            }
            if (response.status === 409) {
                return {
                    ok: false,
                    reason: 'conflict',
                    current: summaryOf(readCurrent(response)),
                };
            }
            if (response.status === 422 && isLimitError(response.body)) {
                return { ok: false, reason: 'limit' };
            }

            return fail(response);
        },

        async putPhoto(photo) {
            await options.uploadPhoto?.(photo);
        },

        async delete(id) {
            const response = await client.request('DELETE', path(id));
            // Already gone is the result the caller wanted.
            if (response.status !== 204 && response.status !== 404) {
                fail(response);
            }
        },

        async patch(id, patch) {
            return changeResult(await client.request('PATCH', path(id), patch));
        },

        async rename(id, name, baseRevision) {
            return changeResult(
                await client.request('PATCH', `${path(id)}/name`, {
                    name,
                    baseRevision,
                }),
            );
        },

        async duplicate(id, name) {
            const response = await client.request(
                'POST',
                `${path(id)}/duplicate`,
                name === undefined ? undefined : { name },
            );
            if (response.status === 201 && isJsonObject(response.body)) {
                return {
                    ok: true,
                    edition: readEdition(response.body.edition),
                };
            }
            if (response.status === 404) {
                return { ok: false, reason: 'missing' };
            }
            if (response.status === 422 && isLimitError(response.body)) {
                return {
                    ok: false,
                    reason: 'limit',
                    limit: response.body.limit,
                };
            }

            return fail(response);
        },

        async importEditions(editions) {
            const response = await client.request(
                'POST',
                '/api/editions/import',
                { editions },
            );
            if (!response.ok || !isJsonObject(response.body)) {
                return fail(response);
            }
            const invalid: Record<string, string[]> = {};
            if (isJsonObject(response.body.invalid)) {
                for (const [id, messages] of Object.entries(
                    response.body.invalid,
                )) {
                    invalid[id] = readStrings(messages);
                }
            }

            return {
                imported: readStrings(response.body.imported),
                conflicts: readStrings(response.body.conflicts),
                overLimit: readStrings(response.body.overLimit),
                invalid,
            };
        },
    };
}
