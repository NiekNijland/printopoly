import { describe, expect, it, vi } from 'vitest';

import { formOf, requestOf, stubFetch } from '@/testing/fetch';
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
    it('passes on how long the server asks to wait', async () => {
        stubFetch(() =>
            Promise.resolve(
                new Response('{}', {
                    status: 429,
                    headers: { 'Retry-After': '42' },
                }),
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
        const fetch = stubFetch((url: string) =>
            Promise.resolve(
                new Response('{}', {
                    status: url.includes('gone') ? 404 : 200,
                }),
            ),
        );

        expect(await findReusableJob('e1', 5, storage)).toBe('kept');
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('finds nothing for a changed edition, so the page uploads it again', async () => {
        stubFetch(() => Promise.resolve(new Response('{}', { status: 200 })));

        expect(await findReusableJob('e1', 6, storage)).toBeNull();
    });
});

describe('uploadPrintJob', () => {
    it('reports every photo and its bytes as it reaches the server (round 4, bug 11)', async () => {
        const created = {
            token: 't',
            url: '/en/print/t',
            statusUrl: '/api/print/t/status',
        };
        stubFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify(created), { status: 201 }),
            ),
        );
        const photos = Object.fromEntries(
            Array.from({ length: 25 }, (_, i) => [
                `photo-${String(i)}`,
                new Blob(['x']),
            ]),
        );
        const progress: [number, number, number, number][] = [];

        await uploadPrintJob(
            {
                edition: {},
                photos,
                targets: { printer: {}, home: {} },
                locale: 'nl',
            },
            '/api/print-jobs',
            ({ done, total, sentBytes, totalBytes }) =>
                progress.push([done, total, sentBytes, totalBytes]),
        );

        // One request per photo: the count never stands still for ten photos at a time.
        expect(progress).toHaveLength(26);
        expect(progress[0]).toEqual([0, 25, 0, 25]);
        expect(progress[1]).toEqual([1, 25, 1, 25]);
        expect(progress[25]).toEqual([25, 25, 25, 25]);
    });

    it('sends a photo again once the connection is back (round 4, bug 12)', async () => {
        const created = {
            token: 't',
            url: '/en/print/t',
            statusUrl: '/api/print/t/status',
        };
        let calls = 0;
        const fetchMock = stubFetch(() => {
            calls++;

            // The second request finds no network.
            return calls === 2
                ? Promise.reject(new TypeError('Failed to fetch'))
                : Promise.resolve(
                      new Response(JSON.stringify(created), {
                          status: 201,
                      }),
                  );
        });
        const offline: boolean[] = [];
        const upload = uploadPrintJob(
            {
                edition: {},
                photos: { a: new Blob(['x']), b: new Blob(['y']) },
                targets: { printer: {}, home: {} },
                locale: 'nl',
                previous: 'old-token',
            },
            '/api/print-jobs',
            (progress) => offline.push(progress.offline),
        );

        await vi.waitFor(() => {
            expect(offline).toContain(true);
        });
        window.dispatchEvent(new Event('online'));

        await expect(upload).resolves.toEqual(created);
        expect(calls).toBe(3);
        expect(offline.at(-1)).toBe(false);

        const first = formOf(requestOf(fetchMock).init);
        expect(first.get('previous')).toBe('old-token');
    });
});
