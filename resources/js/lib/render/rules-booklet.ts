import type { CurrencyId, GroupId, Locale, Space } from '@/types/game';

import { englishPages } from './rules-booklet-en';
import { bookletFacts } from './rules-booklet-facts';
import { dutchPages } from './rules-booklet-nl';

/**
 * The text of the rules booklet (B123), in our own words (B76): no sentence is taken from a published rule
 * book. The numbers (prices, rents, the start money) come from the data of the edition, so the booklet always
 * matches the cards and the money that go in the same box.
 */

/** Names the booklet uses for the pieces; the edition's own words replace them through `RulesContext.words`. */
export type RulesWords = {
    house: string;
    houses: string;
    hotel: string;
    hotels: string;
    /** Stations and utilities, as the edition calls them (`words.station`, `words.utility`, B172). */
    station: string;
    stations: string;
    utility: string;
    utilities: string;
    /** The jail as it reads in a sentence, with its article in Dutch ("de gevangenis"). */
    jail: string;
    start: string;
    chance: string;
    chest: string;
    /** The names of the corners Free Parking and Go to Jail, as on the board. */
    parking: string;
    goToJail: string;
};

export type RulesContext = {
    locale: Locale;
    currency: CurrencyId;
    /** The edition's own currency sign, when it has one (bug 7 of test round 3). */
    symbol?: string;
    /** How much play money is in the box (B156); absent when the edition prints none. */
    money?: { notes: number; maxPlayers: number };
    /** The edition prints no money: the booklet does not promise any in the box (bug 34 of test round 4). */
    noMoney?: boolean;
    /** Name of the edition, as on the board. */
    name: string;
    words: RulesWords;
    /** The name of every space, in board order (a renamed street reads renamed in the price list). */
    spaceNames: readonly string[];
    /** One house rule per line, from the house rules of the edition; empty when there are none. */
    houseRules: readonly string[];
    /** The town of a colour group, when the edition names one: it labels the group in the price list. */
    groupTowns?: Readonly<Partial<Record<string, string>>>;
    /** The spaces with the amounts of the edition (B132); the standard spaces when absent. */
    spaces?: readonly Space[];
    /** Cards per deck, with the extra cards (B135); 16 each when absent. */
    cards?: { chance: number; chest: number };
};

export const DEFAULT_WORDS: Record<Locale, RulesWords> = {
    nl: {
        house: 'huisje',
        houses: 'huisjes',
        hotel: 'hotel',
        hotels: 'hotels',
        station: 'station',
        stations: 'stations',
        utility: 'nutsbedrijf',
        utilities: 'nutsbedrijven',
        jail: 'de gevangenis',
        start: 'Start',
        chance: 'Kans',
        chest: 'Algemeen Fonds',
        parking: 'Vrij parkeren',
        goToJail: 'Ga naar de gevangenis',
    },
    en: {
        house: 'house',
        houses: 'houses',
        hotel: 'hotel',
        hotels: 'hotels',
        station: 'station',
        stations: 'stations',
        utility: 'utility',
        utilities: 'utilities',
        jail: 'jail',
        start: 'Start',
        chance: 'Chance',
        chest: 'Community Chest',
        parking: 'Free Parking',
        goToJail: 'Go to Jail',
    },
};

export type RulesBlock =
    | { type: 'p'; text: string }
    | { type: 'list'; items: string[]; numbered?: boolean }
    | { type: 'tip'; text: string };

export type TextPage = {
    kind: 'text';
    kicker: string;
    title: string;
    blocks: RulesBlock[];
};

type PriceRow = {
    name: string;
    group: GroupId | 'station' | 'utility';
    /** Plain numbers, formatted for the language; the heading says which currency. */
    price: string;
    rent: string;
    hotel: string;
    house: string;
    mortgage: string;
};

export type PriceListPage = {
    kind: 'prices';
    kicker: string;
    title: string;
    heads: {
        name: string;
        price: string;
        rent: string;
        hotel: string;
        house: string;
        mortgage: string;
    };
    groups: {
        id: GroupId | 'station' | 'utility';
        label: string;
        rows: PriceRow[];
    }[];
    note: string;
};

type HouseRulesPage = {
    kind: 'houseRules';
    kicker: string;
    title: string;
    intro: string;
    rules: string[];
    /** Empty lines to write on when the edition has no house rules yet. */
    blankLines: number;
};

type NotesPage = {
    kind: 'notes';
    kicker: string;
    title: string;
    intro: string;
    players: string;
    lines: number;
};

export type CoverPage = {
    kind: 'cover';
    title: string;
    subtitle: string;
};

export type BackPage = {
    kind: 'back';
    title: string;
    line: string;
    credit: string;
};

export type BookletPageContent =
    | CoverPage
    | TextPage
    | PriceListPage
    | HouseRulesPage
    | NotesPage
    | BackPage;

/** All sixteen pages of the booklet, in reading order. */
export const bookletPages = (ctx: RulesContext): BookletPageContent[] => {
    const facts = bookletFacts(ctx);

    return ctx.locale === 'nl'
        ? dutchPages(ctx, facts)
        : englishPages(ctx, facts);
};
