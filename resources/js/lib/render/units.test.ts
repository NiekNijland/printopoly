import { describe, expect, it } from 'vitest';

import { mm } from './units';

describe('mm', () => {
    it('writes a whole number as millimetres', () => {
        expect(mm(12)).toBe('12mm');
    });

    it('rounds to three decimals to drop floating point noise', () => {
        expect(mm(0.1 + 0.2)).toBe('0.3mm');
        expect(mm(1.23456)).toBe('1.235mm');
    });

    it('keeps a negative length', () => {
        expect(mm(-2.5)).toBe('-2.5mm');
    });
});
