import type { CurrencyId, Locale } from './types';

/**
 * The currency a new edition starts with: euro in Dutch, pound in English (B154). It also stands in where an
 * edition names no currency, such as a drawing on the landing page.
 */
export function defaultCurrency(language: Locale): CurrencyId {
    return language === 'nl' ? 'eur' : 'gbp';
}

/**
 * Whether the currency is still the one the edition started with. English editions made before B154 started with
 * M, so for them M still counts as the start currency.
 */
export function isDefaultCurrency(
    language: Locale,
    currency: CurrencyId,
): boolean {
    return (
        currency === defaultCurrency(language) ||
        (language === 'en' && currency === 'play')
    );
}
