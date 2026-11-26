import { vi } from 'vitest';

type FetchInput = Parameters<typeof fetch>[0];

/** What the fake answers to one request; a promise that never settles is a request that hangs. */
type Answer = (url: string, init: RequestInit) => Response | Promise<Response>;

const urlOf = (input: FetchInput): string =>
    typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

/** A JSON response, the way the server sends one. */
const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status });

/**
 * A typed fake of fetch, stubbed as the global for this test; the set-up puts the network guard back after it.
 * Without an answer every request gets an empty JSON object.
 */
export const stubFetch = (answer: Answer = () => jsonResponse({})) => {
    const fake = vi.fn((input: FetchInput, init: RequestInit = {}) =>
        Promise.resolve(answer(urlOf(input), init)),
    );
    vi.stubGlobal('fetch', fake);

    return fake;
};

/** Answers the requests with these responses, one each, in this order. */
export const inOrder =
    (responses: Response[]): Answer =>
    () => {
        const next = responses.shift();
        if (next === undefined) {
            throw new Error(
                'fetch was called more often than the test expects',
            );
        }

        return next;
    };

export type FetchFake = ReturnType<typeof stubFetch>;

/** The URL and options of one request the fake received, by its index (the first by default). */
export const requestOf = (
    fake: FetchFake,
    index = 0,
): { url: string; init: RequestInit } => {
    const call = fake.mock.calls[index];
    if (call === undefined) {
        throw new Error(
            `fetch was called ${String(fake.mock.calls.length)} times, not ${String(index + 1)}`,
        );
    }

    return { url: urlOf(call[0]), init: call[1] ?? {} };
};

/** Every request the fake received, in order. */
export const requestsOf = (
    fake: FetchFake,
): { url: string; init: RequestInit }[] =>
    fake.mock.calls.map(([input, init = {}]) => ({ url: urlOf(input), init }));

/** The form a request sent as its body. */
export const formOf = (init: RequestInit): FormData => {
    if (!(init.body instanceof FormData)) {
        throw new Error('The request has no form as its body');
    }

    return init.body;
};

/** The text a request sent as its body, such as JSON. */
const textOf = (init: RequestInit): string => {
    if (typeof init.body !== 'string') {
        throw new Error('The request has no text as its body');
    }

    return init.body;
};

/** The JSON a request sent as its body. */
export const jsonOf = (init: RequestInit): unknown => JSON.parse(textOf(init));
