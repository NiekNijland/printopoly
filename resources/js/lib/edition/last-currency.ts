import type { CurrencyId } from '@/lib/game/types';

/**
 * The currency picked last in Nieuwe editie (R5-22, B227): the next new edition starts with it, whatever its
 * language, so someone in the Netherlands who makes English editions picks euro once. Only a currency the visitor
 * picked is kept, never the one that followed the language. A convenience: reading and writing never throw, and
 * the page works without it.
 */

const KEY = 'printopoly.lastCurrency';

const KNOWN: readonly CurrencyId[] = ['eur', 'gbp', 'usd', 'play'];

export function readLastCurrency(): CurrencyId | null {
    try {
        const value = window.localStorage.getItem(KEY);

        return KNOWN.find((id) => id === value) ?? null;
    } catch {
        return null;
    }
}

export function rememberCurrency(currency: CurrencyId): void {
    try {
        window.localStorage.setItem(KEY, currency);
    } catch {
        // Private window or full storage: the next edition starts with the currency of its language.
    }
}
