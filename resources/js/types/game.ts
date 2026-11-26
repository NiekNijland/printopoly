export type Locale = 'nl' | 'en';

export type Localized = Record<Locale, string>;

export type GroupId =
    | 'brown'
    | 'lightblue'
    | 'pink'
    | 'orange'
    | 'red'
    | 'yellow'
    | 'green'
    | 'darkblue';

export type CornerKind = 'start' | 'jail' | 'parking' | 'gotojail';

export type CurrencyId = 'eur' | 'usd' | 'gbp' | 'play';

export type DeckId = 'chance' | 'chest';

/** Base rent, then 1, 2, 3, 4 houses, then hotel. */
export type StreetRent = readonly [
    number,
    number,
    number,
    number,
    number,
    number,
];

/** Rent with 1, 2, 3 and 4 stations owned. */
export type StationRent = readonly [number, number, number, number];

export type CornerSpace = {
    position: number;
    type: 'corner';
    corner: CornerKind;
    /** Only on the Start corner. */
    salary?: number;
    name: Localized;
};

export type StreetSpace = {
    position: number;
    type: 'street';
    group: GroupId;
    name: Localized;
    price: number;
    rent: StreetRent;
    houseCost: number;
    mortgage: number;
};

export type StationSpace = {
    position: number;
    type: 'station';
    name: Localized;
    price: number;
    rent: StationRent;
    mortgage: number;
};

export type UtilitySpace = {
    position: number;
    type: 'utility';
    name: Localized;
    price: number;
    /** Rent is this multiplier times the dice, with 1 or 2 utilities owned. */
    multipliers: readonly [number, number];
    mortgage: number;
};

export type TaxSpace = {
    position: number;
    type: 'tax';
    name: Localized;
    amount: number;
};

type CardSpace = {
    position: number;
    type: 'chance' | 'chest';
    name: Localized;
};

export type Space =
    | CornerSpace
    | StreetSpace
    | StationSpace
    | UtilitySpace
    | TaxSpace
    | CardSpace;

export type OwnableSpace = StreetSpace | StationSpace | UtilitySpace;

type Group = {
    id: GroupId;
    color: string;
    name: Localized;
};

export type Card = {
    /** `chance.01` to `chance.16`, `chest.01` to `chest.16`. */
    id: string;
    /** Short description of the original effect, shown as reference in the editor (B32). */
    effect: Localized;
    /**
     * The story on the card. When the card has an `amount`, the amount is not in the text: it is printed as the
     * bottom line ("Pay 50"), unless the text holds an `{amount}` variable itself.
     */
    text: Localized;
    /** Standard amount of a simple pay (negative) or receive (positive) card, in whole amounts (B132). */
    amount?: number;
};

type Decks = {
    chance: readonly Card[];
    chest: readonly Card[];
};

export type Note = {
    value: number;
    count: number;
    color: string;
};

type StartingCashPart = {
    value: number;
    count: number;
};

type Money = {
    notes: readonly Note[];
    startingCash: {
        total: number;
        split: readonly StartingCashPart[];
    };
};

type Components = {
    titleDeeds: number;
    houses: number;
    hotels: number;
    cardSizeMm: { width: number; height: number };
};

export type Currency = {
    id: CurrencyId;
    symbol: string;
    name: Localized;
};

export type StandardEdition = {
    schemaVersion: number;
    spaces: readonly Space[];
    groups: readonly Group[];
    decks: Decks;
    money: Money;
    components: Components;
    currencies: readonly Currency[];
};

export type SpacesBySide = {
    corners: readonly CornerSpace[];
    /** Positions 1 to 9, right to left. */
    bottom: readonly Space[];
    /** Positions 11 to 19, bottom to top. */
    left: readonly Space[];
    /** Positions 21 to 29, left to right. */
    top: readonly Space[];
    /** Positions 31 to 39, top to bottom. */
    right: readonly Space[];
};
