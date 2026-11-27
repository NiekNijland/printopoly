import { PrintApiError, fileNameOf, retryAfterOf } from './print-api-error';

const withRetryAfter = (value: string) =>
    new Response('', { status: 429, headers: { 'Retry-After': value } });

describe('print-api-error', () => {
    it('carries the status and the wait the server asks for', () => {
        const error = new PrintApiError(429, 'Too Many', 12);

        expect(error).toBeInstanceOf(Error);
        expect(error.status).toBe(429);
        expect(error.retryAfter).toBe(12);
        expect(new PrintApiError(500, 'x').retryAfter).toBeNull();
    });

    it('reads Retry-After as seconds or as a date (bug 4 of test round 3)', () => {
        expect(retryAfterOf(withRetryAfter('30'))).toBe(30);
        expect(retryAfterOf(withRetryAfter('0'))).toBe(1);
        expect(retryAfterOf(withRetryAfter(' '))).toBeNull();
        expect(retryAfterOf(withRetryAfter('later'))).toBeNull();
        vi.setSystemTime(Date.UTC(2026, 2, 14, 10));
        const at = new Date(Date.UTC(2026, 2, 14, 10, 0, 20)).toUTCString();
        expect(retryAfterOf(withRetryAfter(at))).toBe(20);
        expect(retryAfterOf(new Response(''))).toBeNull();
    });

    it('takes the file name the server sends, else the fallback', () => {
        expect(fileNameOf(null, 'board.pdf')).toBe('board.pdf');
        expect(fileNameOf('attachment; filename="club-bord.pdf"', 'x')).toBe(
            'club-bord.pdf',
        );
        expect(
            fileNameOf("attachment; filename*=UTF-8''caf%C3%A9.pdf", 'x'),
        ).toBe('café.pdf');
        expect(
            fileNameOf(
                'attachment; filename*=UTF-8\'\'%E0%A4%A.pdf; filename="plain.pdf"',
                'x',
            ),
        ).toBe('plain.pdf');
        expect(fileNameOf('inline', 'fallback.pdf')).toBe('fallback.pdf');
    });
});
