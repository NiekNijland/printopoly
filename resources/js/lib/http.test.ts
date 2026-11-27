import { describe, expect, it } from 'vitest';

import { requestOf, stubFetch } from '@/testing/fetch';

import { sendRequest } from './http';

describe('sendRequest', () => {
    it('sends a GET with the session cookie when nothing else is asked', async () => {
        const fake = stubFetch();

        const response = await sendRequest('/api/thing');

        expect(response.status).toBe(200);
        expect(requestOf(fake)).toEqual({
            url: '/api/thing',
            init: {
                method: 'GET',
                headers: undefined,
                body: undefined,
                credentials: 'same-origin',
            },
        });
    });

    it('passes the method, the headers and the body on', async () => {
        const fake = stubFetch();

        await sendRequest('/api/thing', {
            method: 'PATCH',
            headers: { Accept: 'application/json' },
            body: '{"a":1}',
        });

        expect(requestOf(fake).init).toEqual({
            method: 'PATCH',
            headers: { Accept: 'application/json' },
            body: '{"a":1}',
            credentials: 'same-origin',
        });
    });
});
