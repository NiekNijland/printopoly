import { formatNumber, numberFormatter } from './number-format';

describe('number format', () => {
    it('formats a number for the locale', () => {
        expect(formatNumber(1500, 'nl-NL')).toBe('1.500');
        expect(formatNumber(1500, 'en-GB')).toBe('1,500');
        expect(formatNumber(2.345, 'en-GB', { maximumFractionDigits: 2 })).toBe(
            '2.35',
        );
    });

    it('builds one formatter per locale and options', () => {
        expect(numberFormatter('nl-NL')).toBe(numberFormatter('nl-NL'));
        expect(numberFormatter('nl-NL')).not.toBe(numberFormatter('en-GB'));
        expect(numberFormatter('nl-NL', { maximumFractionDigits: 0 })).not.toBe(
            numberFormatter('nl-NL'),
        );
    });
});
