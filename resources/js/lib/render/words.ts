import { formatMoney } from '@/lib/game/standard-edition';
import type { CurrencyId, DeckId, Locale } from '@/lib/game/types';

export interface WordPair {
    singular: string;
    plural: string;
}

/** The words of the standard cards and deeds, for a renderer that is not given the words of an edition. */
export const STANDARD_BUILDINGS: Record<
    Locale,
    { house: WordPair; hotel: WordPair; station: WordPair; utility: WordPair }
> = {
    nl: {
        house: { singular: 'huis', plural: 'huizen' },
        hotel: { singular: 'hotel', plural: 'hotels' },
        station: { singular: 'station', plural: 'stations' },
        utility: { singular: 'nutsbedrijf', plural: 'nutsbedrijven' },
    },
    en: {
        house: { singular: 'house', plural: 'houses' },
        hotel: { singular: 'hotel', plural: 'hotels' },
        station: { singular: 'station', plural: 'stations' },
        utility: { singular: 'utility', plural: 'utilities' },
    },
};

/**
 * The words of an edition that the renderers print: its own names for houses and hotels, the decks and
 * the currency. A missing field means "the standard word", so a renderer without words (a test, the landing
 * page) draws the standard edition.
 */
export interface RenderWords {
    house?: WordPair;
    hotel?: WordPair;
    /** What the edition calls its stations and utilities (`words.station`, `words.utility`). */
    station?: WordPair;
    utility?: WordPair;
    decks?: Partial<Record<DeckId, string>>;
    currencySymbol?: string;
    currencyName?: string;
    /** The name of an own currency ("Kus"), printed on the notes in place of "speelgeld". */
    noteName?: string;
}

/** `€ 1.500` in Dutch, `€1,500` in English, with the edition's own symbol when it has one. */
export function money(
    amount: number,
    currency: CurrencyId,
    locale: Locale,
    words?: RenderWords,
): string {
    return formatMoney(amount, currency, locale, words?.currencySymbol);
}

/** First letter in capitals, for a word at the start of a sentence. */
export function capitalize(word: string): string {
    return word === '' ? word : word.charAt(0).toUpperCase() + word.slice(1);
}
