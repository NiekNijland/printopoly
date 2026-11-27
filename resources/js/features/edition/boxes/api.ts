import { isJsonObject } from '@/features/edition/remote/client';
import { sendRequest } from '@/lib/http';
import type { HttpMethod } from '@/lib/http';

import {
    readAccountBox,
    readCreatedBox,
    readFailureMessage,
    readJobId,
    readJobState,
    readOwnerBox,
    readReceipt,
} from './answers';
import type {
    BoxSnapshot,
    ContributionPart,
    CreatedBox,
    OwnerBox,
} from './types';

/** The header that carries the owner secret; the server hashes it (App\Boxes\BoxAccess). */
const OWNER_HEADER = 'X-Box-Owner';

export class BoxApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

const csrfToken = (): string => {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
};

const failure = async (response: Response): Promise<BoxApiError> => {
    let message = response.statusText;
    try {
        const body: unknown = await response.json();
        message = readFailureMessage(body, message);
    } catch {
        // Not JSON: the status text stays.
    }

    return new BoxApiError(response.status, message);
};

type RequestOptions = {
    method?: HttpMethod;
    secret?: string | null;
    json?: unknown;
    body?: FormData;
};

const send = async (
    url: string,
    options: RequestOptions,
): Promise<Response> => {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-CSRF-TOKEN': csrfToken(),
    };
    if (options.secret !== undefined && options.secret !== null) {
        headers[OWNER_HEADER] = options.secret;
    }
    if (options.json !== undefined) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await sendRequest(url, {
        method: options.method,
        headers,
        body:
            options.body ??
            (options.json === undefined
                ? undefined
                : JSON.stringify(options.json)),
    });
    if (!response.ok) {
        throw await failure(response);
    }

    return response;
};

const json = async <T>(
    url: string,
    options: RequestOptions,
    read: (value: unknown) => T,
): Promise<T> => {
    const body: unknown = await (await send(url, options)).json();

    return read(body);
};

export type NewBoxInput = {
    editionId: string;
    editionName: string;
    language: string;
    snapshot: BoxSnapshot;
};

/** Makes the box of an edition. The answer carries the owner secret once (a box of an account has none). */
export const createBox = (input: NewBoxInput): Promise<CreatedBox> => {
    return json('/api/boxes', { method: 'POST', json: input }, readCreatedBox);
};

export const fetchBox = (
    id: string,
    secret: string | null,
): Promise<OwnerBox> => {
    return json(`/api/boxes/${id}`, { secret }, readOwnerBox);
};

/** The box of an edition of the logged-in account, for a device that has no owner secret. */
export const findAccountBox = (editionId: string): Promise<OwnerBox | null> => {
    return json(
        `/api/boxes?edition=${encodeURIComponent(editionId)}`,
        {},
        readAccountBox,
    );
};

export const updateBox = (
    id: string,
    secret: string | null,
    patch: {
        editionName?: string;
        snapshot?: BoxSnapshot;
        cardsHidden?: boolean;
    },
): Promise<OwnerBox> => {
    return json(
        `/api/boxes/${id}`,
        { method: 'PATCH', secret, json: patch },
        readOwnerBox,
    );
};

export const closeBox = (
    id: string,
    secret: string | null,
): Promise<OwnerBox> => {
    return json(
        `/api/boxes/${id}/close`,
        { method: 'POST', secret },
        readOwnerBox,
    );
};

export const renewBoxLink = (
    id: string,
    secret: string | null,
): Promise<OwnerBox> => {
    return json(
        `/api/boxes/${id}/renew`,
        { method: 'POST', secret },
        readOwnerBox,
    );
};

export const deleteBox = async (
    id: string,
    secret: string | null,
): Promise<void> => {
    await send(`/api/boxes/${id}`, { method: 'DELETE', secret });
};

/**
 * The owner applied or passed over a contribution, or some parts of it (B175). Applying a part passes over the same
 * part of the other contributions for that element; the server does that.
 */
export const resolveContribution = (
    boxId: string,
    contributionId: string,
    secret: string | null,
    decision: 'accept' | 'reject',
    parts?: readonly ContributionPart[],
): Promise<OwnerBox> => {
    return json(
        `/api/boxes/${boxId}/contributions/${contributionId}/resolve`,
        {
            method: 'POST',
            secret,
            json: parts === undefined ? { decision } : { decision, parts },
        },
        readOwnerBox,
    );
};

/** A photo of a contribution as a blob; only the owner is allowed to read it. */
export const fetchContributionPhoto = async (
    photoUrl: string,
    secret: string | null,
    size: 'preview' | 'print' = 'print',
): Promise<Blob> => {
    const url = size === 'preview' ? `${photoUrl}?size=preview` : photoUrl;

    return (await send(url, { secret })).blob();
};

export type FriendContribution = {
    elementKey: string;
    firstName: string;
    value: string;
    /** A signed amount for a card (minus is paid), or null (B175). */
    amount?: number | null;
    photo: Blob | null;
    /** The honeypot field. A person never sees it, so it stays empty. */
    website?: string;
};

/** A friend adds something. The empty `website` field is the honeypot: people leave it empty, bots fill it. */
export const sendContribution = (
    token: string,
    input: FriendContribution,
): Promise<{ id: string; receipt: string }> => {
    const body = new FormData();
    body.set('elementKey', input.elementKey);
    body.set('firstName', input.firstName);
    body.set('value', input.value);
    if (input.amount !== undefined && input.amount !== null) {
        body.set('amount', String(input.amount));
    }
    body.set('website', input.website ?? '');
    if (input.photo !== null) {
        body.set('photo', input.photo, 'foto.jpg');
    }

    return json(
        `/api/box/${token}/contributions`,
        { method: 'POST', body },
        readReceipt,
    );
};

/** What became of a contribution, for the friend who sent it (B175). */
export type OwnState = 'waiting' | 'applied' | 'passed' | 'handled';

const OWN_STATES: readonly OwnState[] = [
    'waiting',
    'applied',
    'passed',
    'handled',
];

const isOwnState = (value: unknown): value is OwnState =>
    OWN_STATES.some((state) => state === value);

const readOwnStates = (value: unknown): Record<string, OwnState> => {
    if (!isJsonObject(value) || !isJsonObject(value.contributions)) {
        throw new Error('The server answer is not a list of states.');
    }

    return Object.fromEntries(
        Object.entries(value.contributions).filter(
            (entry): entry is [string, OwnState] => isOwnState(entry[1]),
        ),
    );
};

export const fetchOwnReceipts = (
    token: string,
    receipts: string[],
): Promise<Record<string, OwnState>> => {
    const query = receipts
        .map((receipt) => `receipts[]=${encodeURIComponent(receipt)}`)
        .join('&');
    return json(`/api/box/${token}/mine?${query}`, {}, readOwnStates);
};

/** How often and how long the browser asks for the picture while the job renders it (B174). */
const SHARE_IMAGE_POLL_MS = 1000;
const SHARE_IMAGE_WAIT_MS = 120000;

const pause = (ms: number): Promise<void> =>
    new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * The PNG for "Deel je bord" (B77, B228). The browser sends the edition and small copies of the photos on the board
 * (`shareBoardRequest`); the server renders the picture in a job on the queue (B174) and answers with an id, and the
 * browser asks for it until it is there.
 */
export const makeShareImage = async (
    request: unknown,
    options: { pollMs?: number; waitMs?: number; signal?: AbortSignal } = {},
): Promise<Blob> => {
    const { id } = await json(
        '/api/share-image',
        { method: 'POST', json: request },
        readJobId,
    );
    const pollMs = options.pollMs ?? SHARE_IMAGE_POLL_MS;
    const deadline = Date.now() + (options.waitMs ?? SHARE_IMAGE_WAIT_MS);

    while (Date.now() < deadline) {
        await pause(pollMs);
        options.signal?.throwIfAborted();
        const response = await send(`/api/share-image/${id}`, {});
        if ((response.headers.get('Content-Type') ?? '').startsWith('image/')) {
            return response.blob();
        }
        const state = readJobState(await response.json());
        if (state.status === 'failed') {
            throw new BoxApiError(500, state.message ?? '');
        }
    }

    throw new BoxApiError(504, '');
};
