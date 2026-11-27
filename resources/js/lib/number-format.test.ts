import { formatNumber } from './number-format';

describe('number format', () => {
    it('formats a number for the locale', () => {
        expect(formatNumber(1500, 'nl-NL')).toBe('1.500');
        expect(formatNumber(1500, 'en-GB')).toBe('1,500');
        expect(formatNumber(2.345, 'en-GB', { maximumFractionDigits: 2 })).toBe(
            '2.35',
        );
    });

    it('builds one formatter per locale and options', () => {
        const built = vi.spyOn(Intl, 'NumberFormat');

        formatNumber(1, 'nl-NL', { minimumIntegerDigits: 3 });
        formatNumber(2, 'nl-NL', { minimumIntegerDigits: 3 });
        expect(built).toHaveBeenCalledTimes(1);

        formatNumber(1, 'en-GB', { minimumIntegerDigits: 3 });
        expect(built).toHaveBeenCalledTimes(2);

        formatNumber(1, 'nl-NL', { minimumIntegerDigits: 4 });
        expect(built).toHaveBeenCalledTimes(3);
        vi.restoreAllMocks();
    });
});
