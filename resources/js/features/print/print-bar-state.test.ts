import { barActivity, barProblem } from './print-bar-state';

const t = (key: string, replacements: Record<string, string | number> = {}) =>
    `${key}${JSON.stringify(replacements)}`;

const calm = {
    online: true,
    lost: null,
    uploading: null,
    throttle: null,
    error: null,
};

describe('barProblem', () => {
    it('says nothing when all is well, and the error when there is one', () => {
        expect(barProblem(calm, t)).toBeNull();
        expect(barProblem({ ...calm, error: 'Mislukt' }, t)).toEqual({
            message: 'Mislukt',
            seconds: null,
        });
    });

    it('says the connection is gone, with a retry only once online again', () => {
        const retry = vi.fn();

        expect(barProblem({ ...calm, online: false }, t)).toEqual({
            message: 'print.offline{}',
            seconds: null,
        });
        expect(
            barProblem({ ...calm, online: false, lost: { retry } }, t),
        ).not.toHaveProperty('onRetryNow');
        expect(barProblem({ ...calm, lost: { retry } }, t)?.onRetryNow).toBe(
            retry,
        );
    });

    it('counts down after too many requests, before an older error', () => {
        const retryNow = vi.fn();

        expect(
            barProblem(
                { ...calm, error: 'Oud', throttle: { seconds: 12, retryNow } },
                t,
            ),
        ).toEqual({
            message: 'print.throttled{"seconds":12}',
            seconds: 12,
            onRetryNow: retryNow,
        });
    });
});

describe('barActivity', () => {
    const progress = {
        done: 1,
        total: 4,
        sentBytes: 1048576,
        totalBytes: 4194304,
        offline: false,
    };

    it('shows nothing while not working, and the start before an upload', () => {
        expect(barActivity(false, progress, 'nl', t)).toBeNull();
        expect(barActivity(true, null, 'nl', t)).toEqual({
            message: 'print.starting{}',
            fraction: null,
        });
    });

    it('counts the photos and megabytes of the upload (bug 11)', () => {
        expect(barActivity(true, progress, 'nl', t)).toEqual({
            message:
                'print.uploading{"done":1,"total":4,"sent":"1,0","size":"4,0"}',
            fraction: 0.25,
        });
        expect(
            barActivity(true, { ...progress, totalBytes: 0 }, 'en', t)
                ?.fraction,
        ).toBeNull();
    });
});
