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

function csrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}

/** The first validation message the server sent, else the status text. */
async function failure(response: Response): Promise<BoxApiError> {
    let message = response.statusText;
    try {
        const body = (await response.json()) as {
            message?: string;
            errors?: Record<string, string[]>;
        };
        const first = Object.values(body.errors ?? {})[0]?.[0];
        message = first ?? body.message ?? message;
    } catch {
        // Not JSON: the status text stays.
    }

    return new BoxApiError(response.status, message);
}

interface RequestOptions {
    method?: string;
    secret?: string | null;
    json?: unknown;
    body?: FormData;
}

async function send(url: string, options: RequestOptions): Promise<Response> {
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
    const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        credentials: 'same-origin',
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
}

async function json<T>(url: string, options: RequestOptions): Promise<T> {
    return (await (await send(url, options)).json()) as T;
}

export interface NewBoxInput {
    editionId: string;
    editionName: string;
    language: string;
    snapshot: BoxSnapshot;
}

/** Makes the box of an edition. The answer carries the owner secret once (a box of an account has none). */
export function createBox(input: NewBoxInput): Promise<CreatedBox> {
    return json<CreatedBox>('/api/boxes', { method: 'POST', json: input });
}

export function fetchBox(id: string, secret: string | null): Promise<OwnerBox> {
    return json<OwnerBox>(`/api/boxes/${id}`, { secret });
}

/** The box of an edition of the logged-in account, for a device that has no owner secret. */
export async function findAccountBox(
    editionId: string,
): Promise<OwnerBox | null> {
    const { box } = await json<{ box: OwnerBox | null }>(
        `/api/boxes?edition=${encodeURIComponent(editionId)}`,
        {},
    );

    return box;
}

export function updateBox(
    id: string,
    secret: string | null,
    patch: {
        editionName?: string;
        snapshot?: BoxSnapshot;
        cardsHidden?: boolean;
    },
): Promise<OwnerBox> {
    return json<OwnerBox>(`/api/boxes/${id}`, {
        method: 'PATCH',
        secret,
        json: patch,
    });
}

export function closeBox(id: string, secret: string | null): Promise<OwnerBox> {
    return json<OwnerBox>(`/api/boxes/${id}/close`, {
        method: 'POST',
        secret,
    });
}

export function renewBoxLink(
    id: string,
    secret: string | null,
): Promise<OwnerBox> {
    return json<OwnerBox>(`/api/boxes/${id}/renew`, {
        method: 'POST',
        secret,
    });
}

export async function deleteBox(
    id: string,
    secret: string | null,
): Promise<void> {
    await send(`/api/boxes/${id}`, { method: 'DELETE', secret });
}

/**
 * The owner applied or passed over a contribution, or some parts of it (B175). Applying a part passes over the same
 * part of the other contributions for that element; the server does that.
 */
export function resolveContribution(
    boxId: string,
    contributionId: string,
    secret: string | null,
    decision: 'accept' | 'reject',
    parts?: readonly ContributionPart[],
): Promise<OwnerBox> {
    return json<OwnerBox>(
        `/api/boxes/${boxId}/contributions/${contributionId}/resolve`,
        {
            method: 'POST',
            secret,
            json: parts === undefined ? { decision } : { decision, parts },
        },
    );
}

/** A photo of a contribution as a blob; only the owner is allowed to read it. */
export async function fetchContributionPhoto(
    photoUrl: string,
    secret: string | null,
    size: 'preview' | 'print' = 'print',
): Promise<Blob> {
    const url = size === 'preview' ? `${photoUrl}?size=preview` : photoUrl;

    return (await send(url, { secret })).blob();
}

export interface FriendContribution {
    elementKey: string;
    firstName: string;
    value: string;
    /** A signed amount for a card (minus is paid), or null (B175). */
    amount?: number | null;
    photo: Blob | null;
    /** The honeypot field. A person never sees it, so it stays empty. */
    website?: string;
}

/** A friend adds something. The empty `website` field is the honeypot: people leave it empty, bots fill it. */
export function sendContribution(
    token: string,
    input: FriendContribution,
): Promise<{ id: string; receipt: string }> {
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

    return json(`/api/box/${token}/contributions`, { method: 'POST', body });
}

/** What became of a contribution, for the friend who sent it (B175). */
export type OwnState = 'waiting' | 'applied' | 'passed' | 'handled';

export async function fetchOwnReceipts(
    token: string,
    receipts: string[],
): Promise<Record<string, OwnState>> {
    const query = receipts
        .map((receipt) => `receipts[]=${encodeURIComponent(receipt)}`)
        .join('&');
    const { contributions } = await json<{
        contributions: Record<string, OwnState>;
    }>(`/api/box/${token}/mine?${query}`, {});

    return contributions;
}

/** How often and how long the browser asks for the picture while the job renders it (B174). */
const SHARE_IMAGE_POLL_MS = 1000;
const SHARE_IMAGE_WAIT_MS = 120000;

const pause = (ms: number): Promise<void> =>
    new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * The PNG for the group app (B77). The browser sends only the names; the server renders the picture in a job on the
 * queue (B174) and answers with an id, and the browser asks for it until it is there.
 */
export async function makeShareImage(
    edition: unknown,
    options: { pollMs?: number; waitMs?: number } = {},
): Promise<Blob> {
    const { id } = await json<{ id: string }>('/api/share-image', {
        method: 'POST',
        json: { edition },
    });
    const pollMs = options.pollMs ?? SHARE_IMAGE_POLL_MS;
    const deadline = Date.now() + (options.waitMs ?? SHARE_IMAGE_WAIT_MS);

    while (Date.now() < deadline) {
        await pause(pollMs);
        const response = await send(`/api/share-image/${id}`, {});
        if ((response.headers.get('Content-Type') ?? '').startsWith('image/')) {
            return response.blob();
        }
        const state = (await response.json()) as {
            status: string;
            message?: string;
        };
        if (state.status === 'failed') {
            throw new BoxApiError(500, state.message ?? '');
        }
    }

    throw new BoxApiError(504, '');
}
