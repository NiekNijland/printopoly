import { describe, expect, it } from 'vitest';

import { defaultCurrency, isDefaultCurrency } from './game-currency';

describe('defaultCurrency', () => {
    it('starts a Dutch edition in euro and an English one in pounds', () => {
        expect(defaultCurrency('nl')).toBe('eur');
        expect(defaultCurrency('en')).toBe('gbp');
    });
});

describe('isDefaultCurrency', () => {
    it('accepts the start currency of the language', () => {
        expect(isDefaultCurrency('nl', 'eur')).toBe(true);
        expect(isDefaultCurrency('en', 'gbp')).toBe(true);
    });

    it('still counts play money as the start currency of an English edition', () => {
        expect(isDefaultCurrency('en', 'play')).toBe(true);
    });

    it('rejects play money in Dutch and any other currency', () => {
        expect(isDefaultCurrency('nl', 'play')).toBe(false);
        expect(isDefaultCurrency('nl', 'gbp')).toBe(false);
        expect(isDefaultCurrency('en', 'usd')).toBe(false);
    });
});
