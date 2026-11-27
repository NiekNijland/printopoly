import { describe, expect, it } from 'vitest';

import { STANDARD_BUILDINGS, capitalize, money } from './words';

describe('money', () => {
    it('formats an amount in the currency and language', () => {
        expect(money(1500, 'eur', 'nl')).toBe('€\u00A01.500');
        expect(money(1500, 'gbp', 'en')).toBe('£1,500');
    });

    it('uses the own symbol of the edition', () => {
        expect(money(20, 'eur', 'nl', { currencySymbol: 'K' })).toBe(
            'K\u00A020',
        );
        expect(money(20, 'gbp', 'en', { currencySymbol: 'RP' })).toBe(
            'RP\u00A020',
        );
    });
});

describe('capitalize', () => {
    it('puts the first letter in capitals', () => {
        expect(capitalize('huizen')).toBe('Huizen');
    });

    it('leaves an empty word empty', () => {
        expect(capitalize('')).toBe('');
    });
});

describe('STANDARD_BUILDINGS', () => {
    it('has the singular and plural of each building per language', () => {
        expect(STANDARD_BUILDINGS.nl.utility).toEqual({
            singular: 'nutsbedrijf',
            plural: 'nutsbedrijven',
        });
        expect(STANDARD_BUILDINGS.en.house.plural).toBe('houses');
    });
});
