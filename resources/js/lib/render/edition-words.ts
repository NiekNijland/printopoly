import { standardEdition } from '@/lib/render/standard-edition';
import {
    STANDARD_BUILDINGS,
    type RenderWords,
    type WordPair,
} from '@/lib/render/words';
import type {
    CornerKind,
    Currency,
    DeckId,
    Locale,
    StandardEdition,
} from '@/types/game';

import { spaceKey, wordKey, type WordId } from './edition-keys';
import type { Edition } from './edition-types';

/** Longest word or name (house, hotel, deck, currency) and longest symbol, so they fit where they are printed. */
export const MAX_WORD_LENGTH = 40;
export const MAX_SYMBOL_LENGTH = 6;
/** Longest short text on a corner. */
export const MAX_CORNER_TEXT_LENGTH = 120;

/** Position of each corner on the board. */
export const CORNER_POSITIONS: Readonly<Record<CornerKind, number>> = {
    start: 0,
    jail: 10,
    parking: 20,
    gotojail: 30,
};

/** The jail as it reads in the standard card texts; houses and hotels are in the renderer words. */
export const STANDARD_JAIL: Record<Locale, string> = {
    nl: 'de gevangenis',
    en: 'jail',
};

/** The words of an edition after its own choices, in the language of the edition. */
export interface ResolvedWords extends RenderWords {
    house: WordPair;
    hotel: WordPair;
    /** Stations and utilities, as the deeds and the cards call them (`words.station`, `words.utility`). */
    station: WordPair;
    utility: WordPair;
    /** The jail as it reads in a sentence ("de gevangenis"). */
    jail: string;
    decks: Record<DeckId, string>;
    currencySymbol: string;
    currencyName: string;
    /** The symbol the edition chose, or `undefined` for the standard one. */
    customSymbol: string | undefined;
    /** The name of an own currency, or `undefined` for a standard one; printed on the notes. */
    customCurrencyName: string | undefined;
    /** Which words the edition changed. */
    custom: Record<WordId, boolean>;
}

const typed = (value: string | undefined): string | undefined => {
    const trimmed = value?.trim();

    return trimmed === undefined || trimmed === '' ? undefined : trimmed;
};

const standardDeckName = (
    standard: StandardEdition,
    deck: DeckId,
    language: Locale,
): string => {
    return (
        standard.spaces.find((space) => space.type === deck)?.name[language] ??
        deck
    );
};

/** Standard currency of an edition, before its own name and symbol. */
const standardCurrency = (
    edition: Edition,
    standard: StandardEdition,
): Currency => {
    const currency = standard.currencies.find(
        (candidate) => candidate.id === edition.currency,
    );
    if (currency === undefined) {
        throw new RangeError(`Unknown currency ${edition.currency}`);
    }

    return currency;
};

/** The standard words of a language, with no overrides. */
export const standardWords = (
    language: Locale,
    currency: Currency,
    standard: StandardEdition = standardEdition,
): ResolvedWords => {
    const base = STANDARD_BUILDINGS[language];

    return {
        house: base.house,
        hotel: base.hotel,
        station: base.station,
        utility: base.utility,
        jail: STANDARD_JAIL[language],
        decks: {
            chance: standardDeckName(standard, 'chance', language),
            chest: standardDeckName(standard, 'chest', language),
        },
        currencySymbol: currency.symbol,
        currencyName: currency.name[language],
        customSymbol: undefined,
        customCurrencyName: undefined,
        custom: {
            house: false,
            hotel: false,
            jail: false,
            currency: false,
            chance: false,
            chest: false,
            bank: false,
            station: false,
            utility: false,
        },
    };
};

/** What each word is when the edition does not say: used as placeholder in the editor. */
export const defaultWords = (
    edition: Edition,
    standard: StandardEdition = standardEdition,
): ResolvedWords => {
    return standardWords(
        edition.language,
        standardCurrency(edition, standard),
        standard,
    );
};

/** The words of an edition: the overrides of `words.*` on top of the standard words (B59). */
export const resolveWords = (
    edition: Edition,
    standard: StandardEdition = standardEdition,
): ResolvedWords => {
    const base = defaultWords(edition, standard);
    const field = (id: WordId, name: 'name' | 'text') =>
        typed(edition.elements[wordKey(id)]?.[name]);

    const house = field('house', 'name');
    const houses = field('house', 'text');
    const hotel = field('hotel', 'name');
    const hotels = field('hotel', 'text');
    const jail = field('jail', 'name');
    const chance = field('chance', 'name');
    const chest = field('chest', 'name');
    const currencyName = field('currency', 'name');
    const symbol = field('currency', 'text');
    const bank = field('bank', 'name');
    const station = field('station', 'name');
    const stations = field('station', 'text');
    const utility = field('utility', 'name');
    const utilities = field('utility', 'text');

    return {
        // A plural left empty is the singular, so one filled field already gives a usable word.
        house: {
            singular: house ?? base.house.singular,
            plural: houses ?? (house === undefined ? base.house.plural : house),
        },
        hotel: {
            singular: hotel ?? base.hotel.singular,
            plural: hotels ?? (hotel === undefined ? base.hotel.plural : hotel),
        },
        station: {
            singular: station ?? base.station.singular,
            plural:
                stations ??
                (station === undefined ? base.station.plural : station),
        },
        utility: {
            singular: utility ?? base.utility.singular,
            plural:
                utilities ??
                (utility === undefined ? base.utility.plural : utility),
        },
        jail: jail ?? base.jail,
        decks: {
            chance: chance ?? base.decks.chance,
            chest: chest ?? base.decks.chest,
        },
        currencySymbol: symbol ?? base.currencySymbol,
        currencyName: currencyName ?? base.currencyName,
        customSymbol: symbol,
        customCurrencyName: currencyName,
        custom: {
            house: house !== undefined || houses !== undefined,
            hotel: hotel !== undefined || hotels !== undefined,
            jail: jail !== undefined,
            currency: currencyName !== undefined || symbol !== undefined,
            chance: chance !== undefined,
            chest: chest !== undefined,
            bank: bank !== undefined,
            station: station !== undefined || stations !== undefined,
            utility: utility !== undefined || utilities !== undefined,
        },
    };
};

/** The part of the words the renderers read: they do not need to know which ones are custom. */
export const renderWords = (words: ResolvedWords): RenderWords => {
    return {
        house: words.house,
        hotel: words.hotel,
        station: words.station,
        utility: words.utility,
        decks: words.decks,
        currencySymbol: words.customSymbol,
        currencyName: words.currencyName,
        noteName: words.customCurrencyName,
    };
};

const PLACEHOLDER =
    /\{(house|hotel|houses|hotels|jail|station|stations|utility|utilities)\}/g;

/**
 * Fills the placeholders of a standard card text (`{house}`, `{hotel}`, `{jail}`, `{station}`, `{utility}` and
 * their plurals) with the words of an edition.
 */
export const fillWords = (
    text: string,
    words: Pick<
        ResolvedWords,
        'house' | 'hotel' | 'jail' | 'station' | 'utility'
    >,
): string => {
    const { station, utility } = words;

    return text.replace(PLACEHOLDER, (_, id: string) => {
        switch (id) {
            case 'house':
                return words.house.singular;
            case 'houses':
                return words.house.plural;
            case 'hotel':
                return words.hotel.singular;
            case 'hotels':
                return words.hotel.plural;
            case 'station':
                return station.singular;
            case 'stations':
                return station.plural;
            case 'utility':
                return utility.singular;
            case 'utilities':
                return utility.plural;
            default:
                return words.jail;
        }
    });
};

/** Key of the space a corner is, for its name, short text and photo. */
export const cornerKey = (corner: CornerKind): string =>
    spaceKey(CORNER_POSITIONS[corner]);
