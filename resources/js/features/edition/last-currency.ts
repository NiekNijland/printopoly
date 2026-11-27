import { readStored, writeStored } from '@/lib/browser-storage';
import type { CurrencyId } from '@/types/game';

/**
 * The currency picked last in Nieuwe editie (R5-22, B227): the next new edition starts with it, whatever its
 * language, so someone in the Netherlands who makes English editions picks euro once. Only a currency the visitor
 * picked is kept, never the one that followed the language. A convenience: reading and writing never throw, and
 * the page works without it.
 */

const KEY = 'printopoly.lastCurrency';

const KNOWN: readonly CurrencyId[] = ['eur', 'gbp', 'usd', 'play'];

export const readLastCurrency = (): CurrencyId | null => {
    const value = readStored(KEY);

    return KNOWN.find((id) => id === value) ?? null;
};

export const rememberCurrency = (currency: CurrencyId): void => {
    // Private window or full storage: the next edition starts with the currency of its language.
    writeStored(KEY, currency);
};
