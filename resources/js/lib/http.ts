export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpRequest = {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: string | FormData;
};

export const sendRequest = (
    url: string,
    request: HttpRequest = {},
): Promise<Response> =>
    fetch(url, {
        method: request.method ?? 'GET',
        headers: request.headers,
        body: request.body,
        credentials: 'same-origin',
    });
