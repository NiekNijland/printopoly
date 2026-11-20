import { afterEach, describe, expect, it, vi } from 'vitest';

import { PHOTOS_PER_REQUEST, photoBatches, uploadPrintJob } from './api';

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
