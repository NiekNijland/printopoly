import { PrintApiError } from '@/lib/render/print-api-error';

import { runFailureOf } from './print-run-failure';

describe('runFailureOf', () => {
    it('keeps the parts in line when the job is still busy (409)', () => {
        expect(runFailureOf(new PrintApiError(409, 'Conflict'), true)).toEqual({
            kind: 'busy',
        });
        expect(runFailureOf(new PrintApiError(409, 'Conflict'), false)).toEqual(
            { kind: 'error', message: 'print.error_busy' },
        );
    });

    it('calls a request that never reached the server lost (bug 12)', () => {
        expect(runFailureOf(new TypeError('Failed to fetch'), true)).toEqual({
            kind: 'lost',
        });
    });

    it('waits as long as the server says after too many requests, else a minute', () => {
        expect(
            runFailureOf(new PrintApiError(429, 'Too Many', 30), true),
        ).toEqual({ kind: 'throttled', seconds: 30 });
        expect(runFailureOf(new PrintApiError(429, 'Too Many'), true)).toEqual({
            kind: 'throttled',
            seconds: 60,
        });
    });

    it('names the photos for 422 and says something general otherwise', () => {
        expect(runFailureOf(new PrintApiError(422, 'Bad'), true)).toEqual({
            kind: 'error',
            message: 'print.error_photos',
        });
        expect(runFailureOf(new Error('boom'), true)).toEqual({
            kind: 'error',
            message: 'print.error_generic',
        });
    });
});
