import { formatCm, formatMegabytes, formatMm } from './print-format';

describe('print-format', () => {
    it('writes megabytes with one decimal, a comma in Dutch and at least 0.1', () => {
        expect(formatMegabytes(3 * 1048576 + 524288, 'nl')).toBe('3,5');
        expect(formatMegabytes(3 * 1048576 + 524288, 'en')).toBe('3.5');
        expect(formatMegabytes(10, 'en')).toBe('0.1');
    });

    it('writes millimetres whole or with one decimal', () => {
        expect(formatMm(63, 'nl')).toBe('63');
        expect(formatMm(63.25, 'nl')).toBe('63,3');
        expect(formatMm(63.25, 'en')).toBe('63.3');
    });

    it('writes the whole board in whole centimetres', () => {
        expect(formatCm(500, 'nl')).toBe('50 × 50 cm');
        expect(formatCm(506, 'en')).toBe('51 × 51 cm');
    });
});
