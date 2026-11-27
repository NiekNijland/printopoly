import {
    PHOTOS_PER_REQUEST,
    appendPhotos,
    photoBatches,
    trackUpload,
    type UploadProgress,
} from './print-upload-progress';

const blob = (size: number) => new Blob(['x'.repeat(size)]);

describe('print-upload-progress', () => {
    it('sends one photo per request, and one empty batch without photos', () => {
        expect(PHOTOS_PER_REQUEST).toBe(1);
        expect(photoBatches({})).toEqual([[]]);
        expect(photoBatches({ a: blob(1), b: blob(2) })).toHaveLength(2);
    });

    it('puts each photo in the form under its ref', () => {
        const body = new FormData();
        appendPhotos(body, [['p1', blob(3)]]);

        expect(body.get('photos[p1]')).toBeInstanceOf(Blob);
        expect(body.get('photos[p2]')).toBeNull();
    });

    it('counts the photos and bytes sent, and says once when the connection goes (bug 11, 12)', () => {
        const seen: UploadProgress[] = [];
        const { offline, sent } = trackUpload(
            { a: blob(10), b: blob(30) },
            (progress) => seen.push(progress),
        );

        expect(seen[0]).toEqual({
            done: 0,
            total: 2,
            sentBytes: 0,
            totalBytes: 40,
            offline: false,
        });
        sent([['a', blob(10)]]);
        offline(true);
        offline(true);
        offline(false);
        expect(seen.map((p) => [p.done, p.sentBytes, p.offline])).toEqual([
            [0, 0, false],
            [1, 10, false],
            [1, 10, true],
            [1, 10, false],
        ]);
    });
});
