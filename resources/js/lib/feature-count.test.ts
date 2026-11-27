import { afterEach, describe, expect, it, vi } from 'vitest';

import { jsonOf, requestOf, stubFetch } from '@/testing/fetch';

import { countFeature } from './feature-count';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('countFeature', () => {
    it('sends nothing while the tests run', () => {
        const fake = stubFetch();

        countFeature('edition_created');

        expect(fake).not.toHaveBeenCalled();
    });

    it('posts the bare event name without cookies and lets it outlive the page', () => {
        vi.stubEnv('MODE', 'production');
        const fake = stubFetch();

        countFeature('photo_added');

        const { url, init } = requestOf(fake);
        expect(fake).toHaveBeenCalledOnce();
        expect(url).toBe('/api/count');
        expect(init.method).toBe('POST');
        expect(init.credentials).toBe('omit');
        expect(init.keepalive).toBe(true);
        expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
        expect(jsonOf(init)).toEqual({ event: 'photo_added' });
    });

    it('swallows a request that fails', async () => {
        vi.stubEnv('MODE', 'production');
        const fake = stubFetch(() => Promise.reject(new Error('offline')));

        expect(() => countFeature('template_chosen')).not.toThrow();
        await vi.waitFor(() => expect(fake).toHaveBeenCalledOnce());
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it('does nothing in a browser without fetch', () => {
        vi.stubEnv('MODE', 'production');
        vi.stubGlobal('fetch', undefined);

        expect(() => countFeature('edition_created')).not.toThrow();
    });
});
