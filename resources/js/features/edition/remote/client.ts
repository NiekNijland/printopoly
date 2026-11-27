import { parseJson } from '@/lib/json';
import { is, object } from '@/lib/parse';

/**
 * Small fetch wrapper for the JSON API under the web session. It sends the
 * session cookie, asks for JSON (so the server answers 401 instead of a
 * redirect) and puts the CSRF token from the `XSRF-TOKEN` cookie in the
 * `X-XSRF-TOKEN` header, which is what Laravel's web middleware checks.
 */

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ApiClientOptions = {
    /** Defaults to the global `fetch`. */
    fetch?: FetchLike;
    /** Prefix for every path; empty for the same origin. */
    baseUrl?: string;
    /** Defaults to reading the `XSRF-TOKEN` cookie. */
    getCsrfToken?: () => string | undefined;
};

export type ApiResponse = {
    status: number;
    ok: boolean;
    /** The parsed JSON body, or `undefined` when there is none (204, an HTML error page). */
    body: unknown;
};

/** The server turned the request down in a way the caller cannot fix by retrying. */
export class RemoteApiError extends Error {
    constructor(
        readonly status: number,
        readonly body: unknown,
    ) {
        super(`Request failed with status ${status}`);
        this.name = 'RemoteApiError';
    }
}

/** 401, or 419 when the CSRF token is stale: the session is over and the user has to log in again. */
export class RemoteAuthError extends RemoteApiError {
    constructor(status: number, body: unknown) {
        super(status, body);
        this.name = 'RemoteAuthError';
    }
}

/** 429: too many requests. Try again after `retryAfterSeconds`. */
export class RemoteRateLimitError extends RemoteApiError {
    constructor(
        body: unknown,
        readonly retryAfterSeconds: number | undefined,
    ) {
        super(429, body);
        this.name = 'RemoteRateLimitError';
    }
}

export type ApiClient = {
    request(
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        path: string,
        body?: unknown,
    ): Promise<ApiResponse>;
};

const readXsrfCookie = (): string | undefined => {
    if (typeof document === 'undefined') {
        return undefined;
    }
    const match = /(?:^|;\s*)XSRF-TOKEN=([^;]*)/.exec(document.cookie);

    return match?.[1] === undefined ? undefined : decodeURIComponent(match[1]);
};

const readBody = async (response: Response): Promise<unknown> => {
    const text = await response.text();
    if (text === '') {
        return undefined;
    }

    return parseJson(text);
};

/**
 * Returns the response for every status the callers handle themselves (2xx,
 * 404, 409, 422). A network failure rejects with the original error; 401,
 * 419, 429 and 5xx throw.
 */
export const createApiClient = (options: ApiClientOptions = {}): ApiClient => {
    const doFetch: FetchLike =
        options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    const baseUrl = options.baseUrl ?? '';
    const getCsrfToken = options.getCsrfToken ?? readXsrfCookie;

    return {
        async request(method, path, body) {
            const headers: Record<string, string> = {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };
            const token = getCsrfToken();
            if (token !== undefined) {
                headers['X-XSRF-TOKEN'] = token;
            }
            const init: RequestInit = {
                method,
                headers,
                credentials: 'same-origin',
            };
            if (body !== undefined) {
                headers['Content-Type'] = 'application/json';
                init.body = JSON.stringify(body);
            }

            const response = await doFetch(`${baseUrl}${path}`, init);
            const parsed = await readBody(response);

            if (response.status === 401 || response.status === 419) {
                throw new RemoteAuthError(response.status, parsed);
            }
            if (response.status === 429) {
                const retry = Number(response.headers.get('Retry-After'));
                throw new RemoteRateLimitError(
                    parsed,
                    Number.isFinite(retry) && retry > 0 ? retry : undefined,
                );
            }
            if (response.status >= 500) {
                throw new RemoteApiError(response.status, parsed);
            }

            return {
                status: response.status,
                ok: response.ok,
                body: parsed,
            };
        },
    };
};

export const isJsonObject = (value: unknown) => is(object, value);
