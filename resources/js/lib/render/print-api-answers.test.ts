import { describe, expect, it } from 'vitest';

import { is } from '@/lib/parse';

import { jobStatus, jobsReady, uploadResult } from './print-api-answers';

const isJobStatus = (value: unknown) => is(jobStatus, value);
const isUploadResult = (value: unknown) => is(uploadResult, value);
const isJobsReady = (value: unknown) => is(jobsReady, value);

const part = {
    set: 'printer',
    part: 'board',
    status: 'done',
    waitingFor: null,
    pages: 2,
    bytes: 1000,
    downloadUrl: '/board.pdf',
    instructionsUrl: null,
    reason: null,
    imageUrl: null,
};

const status = {
    busy: false,
    printerZipUrl: '/printer.zip',
    homeZipUrl: '/home.zip',
    printerZipReady: true,
    homeZipReady: false,
    zipPreparing: false,
    parts: [part],
};

describe('print-api-answers', () => {
    it('accepts the status of a job and refuses a part it does not know', () => {
        expect(isJobStatus(status)).toBe(true);
        expect(
            isJobStatus({ ...status, parts: [{ ...part, part: 'dice' }] }),
        ).toBe(false);
        expect(
            isJobStatus({ ...status, parts: [{ ...part, status: 'lost' }] }),
        ).toBe(false);
        expect(
            isJobStatus({ ...status, parts: [{ ...part, set: 'shop' }] }),
        ).toBe(false);
        expect(isJobStatus({ ...status, busy: 'no' })).toBe(false);
        expect(
            isJobStatus({ ...status, parts: [{ ...part, waitingFor: 'x' }] }),
        ).toBe(false);
        expect(isJobStatus({ ...status, extra: 1 })).toBe(true);
        expect(isJobStatus(null)).toBe(false);
    });

    it('accepts the links of a new job only when all three are there', () => {
        expect(isUploadResult({ token: 't', url: '/u', statusUrl: '/s' })).toBe(
            true,
        );
        expect(isUploadResult({ token: 't', url: '/u' })).toBe(false);
    });

    it('accepts what is ready per job', () => {
        const ready = {
            token: 't',
            printerReadyUntil: 5,
            printerOutdated: false,
            homeReadyUntil: null,
            homeOutdated: true,
        };

        expect(isJobsReady({ jobs: [ready] })).toBe(true);
        expect(isJobsReady({ jobs: [{ ...ready, homeOutdated: 'yes' }] })).toBe(
            false,
        );
        expect(isJobsReady({ jobs: 'none' })).toBe(false);
    });
});
