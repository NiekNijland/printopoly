import type { CurrencyId, Locale } from '@/lib/game/types';

import { capitalize, type WordPair } from './words';

/** Default texts on the printed elements, per language. Names and card texts come from the game data. */
export interface RenderStrings {
    titleDeed: string;
    rent: string;
    rentFullSet: string;
    rentWithHouses: (count: number, house: WordPair) => string;
    rentWithHotel: (hotel: WordPair) => string;
    rentStations: (count: number) => string;
    utilityRent: (single: number, both: number) => string;
    houseAndHotel: (
        house: string,
        hotel: string,
        words: { house: WordPair; hotel: WordPair },
    ) => string;
    houseCostLabel: (house: WordPair) => string;
    hotelCostLabel: (hotel: WordPair) => string;
    eachCost: (amount: string) => string;
    hotelEachCost: (amount: string, house: WordPair) => string;
    mortgage: string;
    mortgageBack: (unmortgage: string) => string;
    price: string;
    startSalary: (amount: string) => string;
    /** "Pay 50", or "Pay 50 for your language course" with a purpose. */
    pay: (amount: string, purpose?: string) => string;
    receive: (amount: string, purpose?: string) => string;
    justVisiting: string;
    inJail: string;
    parkingAlt: string;
    playMoney: string;
    pawn: string;
    houseRules: string;
    boxLidSubtitle: string;
    /** Tagline under the edition name on the board centre (B125). */
    centerTagline: string;
    cardSpot: string;
}

export const STRINGS: Record<Locale, RenderStrings> = {
    nl: {
        titleDeed: 'Eigendomsbewijs',
        rent: 'Huur',
        rentFullSet: 'Hele kleur in bezit',
        rentWithHouses: (count, house) =>
            `Met ${count} ${count === 1 ? house.singular : house.plural}`,
        rentWithHotel: (hotel) => `Met ${hotel.singular}`,
        rentStations: (count) =>
            count === 1 ? 'Huur met 1 station' : `Huur met ${count} stations`,
        utilityRent: (single, both) =>
            `Bezit je één nutsbedrijf, dan betaalt een speler ${single} keer het aantal ogen. Bezit je er twee, dan is het ${both} keer.`,
        houseAndHotel: (house, hotel, words) =>
            `${capitalize(words.house.singular)} ${house} · ${words.hotel.singular} ${hotel} plus 4 ${words.house.plural}`,
        houseCostLabel: (house) => `Kosten ${house.singular}`,
        hotelCostLabel: (hotel) => `Kosten ${hotel.singular}`,
        eachCost: (amount) => `${amount} per stuk`,
        hotelEachCost: (amount, house) =>
            `${amount} per stuk (plus 4 ${house.plural})`,
        mortgage: 'Hypotheek',
        mortgageBack: (unmortgage) =>
            `Leg deze kaart omgedraaid neer zolang hij verhypothekeerd is. Aflossen kost ${unmortgage}.`,
        price: 'Prijs',
        startSalary: (amount) => `Ontvang ${amount} als je langs Start komt`,
        pay: (amount, purpose) =>
            `Betaal ${amount}${purpose === undefined ? '' : ` voor ${purpose}`}`,
        receive: (amount, purpose) =>
            `Ontvang ${amount}${purpose === undefined ? '' : ` voor ${purpose}`}`,
        justVisiting: 'Op bezoek',
        inJail: 'In de cel',
        parkingAlt: 'Parkeren',
        playMoney: 'speelgeld',
        pawn: 'Pion',
        houseRules: 'Huisregels',
        boxLidSubtitle: 'Een spel voor 2 tot 8 spelers',
        centerTagline: 'Het handelsspel',
        cardSpot: 'Leg de stapel hier',
    },
    en: {
        titleDeed: 'Title deed',
        rent: 'Rent',
        rentFullSet: 'Whole colour owned',
        rentWithHouses: (count, house) =>
            `With ${count} ${count === 1 ? house.singular : house.plural}`,
        rentWithHotel: (hotel) => `With ${hotel.singular}`,
        rentStations: (count) =>
            count === 1 ? 'Rent with 1 station' : `Rent with ${count} stations`,
        utilityRent: (single, both) =>
            `With one utility, a player pays ${single} times the dice roll. With both, it is ${both} times.`,
        houseAndHotel: (house, hotel, words) =>
            `${capitalize(words.house.singular)} ${house} · ${words.hotel.singular} ${hotel} plus 4 ${words.house.plural}`,
        houseCostLabel: (house) => `${capitalize(house.plural)} cost`,
        hotelCostLabel: (hotel) => `${capitalize(hotel.plural)} cost`,
        eachCost: (amount) => `${amount} each`,
        hotelEachCost: (amount, house) =>
            `${amount} each (plus 4 ${house.plural})`,
        mortgage: 'Mortgage',
        mortgageBack: (unmortgage) =>
            `Keep this card face down while it is mortgaged. Paying it off costs ${unmortgage}.`,
        price: 'Price',
        startSalary: (amount) => `Collect ${amount} when you pass Start`,
        pay: (amount, purpose) =>
            `Pay ${amount}${purpose === undefined ? '' : ` for ${purpose}`}`,
        receive: (amount, purpose) =>
            `Collect ${amount}${purpose === undefined ? '' : ` for ${purpose}`}`,
        justVisiting: 'Just visiting',
        inJail: 'In jail',
        parkingAlt: 'Parking',
        playMoney: 'play money',
        pawn: 'Pawn',
        houseRules: 'House rules',
        boxLidSubtitle: 'A game for 2 to 8 players',
        centerTagline: 'The trading game',
        cardSpot: 'Place the deck here',
    },
};

/** An edition's currency when it names none: euros in Dutch, play money (M) in English. */
export function defaultCurrency(locale: Locale): CurrencyId {
    return locale === 'nl' ? 'eur' : 'play';
}
