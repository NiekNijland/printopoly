import { formatDateTime } from './datetime';

describe('datetime', () => {
    it('formats a date for the locale', () => {
        const date = new Date('2026-03-14T10:00:00Z');
        const options = {
            day: 'numeric',
            month: 'long',
            timeZone: 'UTC',
        } as const;

        expect(formatDateTime(date, 'nl-NL', options)).toBe('14 maart');
        expect(formatDateTime(date.getTime(), 'en-GB', options)).toBe(
            '14 March',
        );
    });

    it('builds one formatter per locale and options', () => {
        const built = vi.spyOn(Intl, 'DateTimeFormat');
        const date = new Date('2026-03-14T10:00:00Z');

        formatDateTime(date, 'nl-NL', { year: 'numeric' });
        formatDateTime(date, 'nl-NL', { year: 'numeric' });
        expect(built).toHaveBeenCalledTimes(1);

        formatDateTime(date, 'nl-NL', { year: '2-digit' });
        expect(built).toHaveBeenCalledTimes(2);
        vi.restoreAllMocks();
    });
});
