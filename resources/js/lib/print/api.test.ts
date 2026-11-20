import { describe, expect, it } from 'vitest';

import { PHOTOS_PER_REQUEST, photoBatches } from './api';

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
