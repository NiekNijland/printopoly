import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    PHOTOS_PER_REQUEST,
    PrintApiError,
    findReusableJob,
    photoBatches,
    startRun,
    uploadPrintJob,
} from './api';

describe('photoBatches', () => {
    it('keeps every request under the PHP file limit of 20', () => {
        const photos = Object.fromEntries(
            Array.from({ length: 45 }, (_, i) => [
                `photo${i}`,
                new Blob(['x']),
            ]),
        );
        const batches = photoBatches(photos);

        expect(batches.flat()).toHaveLength(45);
        expect(Math.max(...batches.map((b) => b.length))).toBeLessThanOrEqual(
            PHOTOS_PER_REQUEST,
        );
        expect(PHOTOS_PER_REQUEST).toBeLessThanOrEqual(20);
    });

    it('gives one empty batch when there are no photos', () => {
        expect(photoBatches({})).toEqual([[]]);
    });
});

describe('a busy server (bug 4 of test round 3)', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('passes on how long the server asks to wait', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response('{}', {
                        status: 429,
                        headers: { 'Retry-After': '42' },
                    }),
                ),
            ),
        );

        const error = await startRun('/api/print/t/generate', 'home', [
            'board',
        ]).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(PrintApiError);
        expect((error as PrintApiError).status).toBe(429);
        expect((error as PrintApiError).retryAfter).toBe(42);
    });
});

describe('findReusableJob (bug 9 of test round 3)', () => {
    afterEach(() => vi.unstubAllGlobals());

    const storage = {
        listPrintJobs: () =>
            Promise.resolve([
                { token: 'old', editionId: 'e1', revision: 4, createdAt: 1 },
                { token: 'gone', editionId: 'e1', revision: 5, createdAt: 3 },
                { token: 'kept', editionId: 'e1', revision: 5, createdAt: 2 },
                { token: 'other', editionId: 'e2', revision: 5, createdAt: 9 },
            ]),
    };

    it('takes the newest job of this revision that the server still has', async () => {
        const fetch = vi.fn((url: string) =>
            Promise.resolve(
                new Response('{}', { status: url.includes('gone') ? 404 : 200 }),
            ),
        );
        vi.stubGlobal('fetch', fetch);

        expect(await findReusableJob('e1', 5, storage)).toBe('kept');
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('finds nothing for a changed edition, so the page uploads it again', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
        );

        expect(await findReusableJob('e1', 6, storage)).toBeNull();
    });
});

describe('uploadPrintJob', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('reports how many photos are on the server after every request', async () => {
        const created = {
            token: 't',
            url: '/en/print/t',
            statusUrl: '/api/print/t/status',
        };
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response(JSON.stringify(created), { status: 201 }),
                ),
            ),
        );
        const photos = Object.fromEntries(
            Array.from({ length: 25 }, (_, i) => [
                `photo-${String(i)}`,
                new Blob(['x']),
            ]),
        );
        const progress: [number, number][] = [];

        await uploadPrintJob(
            {
                edition: {},
                photos,
                targets: { printer: {}, home: {} },
                locale: 'nl',
            },
            '/api/print-jobs',
            (done, total) => progress.push([done, total]),
        );

        expect(progress).toEqual([
            [0, 25],
            [10, 25],
            [20, 25],
            [25, 25],
        ]);
    });
});
