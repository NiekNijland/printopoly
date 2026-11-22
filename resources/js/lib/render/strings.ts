import type { Locale } from '@/lib/game/types';

import { capitalize, type WordPair } from './words';

/** Default texts on the printed elements, per language. Names and card texts come from the game data. */
export interface RenderStrings {
    titleDeed: string;
    rent: string;
    rentFullSet: string;
    rentWithHouses: (count: number, house: WordPair) => string;
    rentWithHotel: (hotel: WordPair) => string;
    rentStations: (count: number, station: WordPair) => string;
    utilityRent: (single: number, both: number, utility: WordPair) => string;
    /** "Kosten huis" / "Houses cost", left of the price per building. */
    houseCost: (house: WordPair) => string;
    hotelCost: (hotel: WordPair) => string;
    /** "€ 50 per stuk" / "€50 each". */
    perPiece: (amount: string) => string;
    /** "(plus 4 huizen)" under the hotel cost. */
    plusHouses: (house: WordPair) => string;
    mortgage: string;
    mortgageBack: (unmortgage: string) => string;
    price: string;
    /** The line on the Start corner; `start` is what Start is called now, so a renamed Start reads right. */
    startSalary: (amount: string, start?: string) => string;
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

/**
 * " voor je taalcursus" after the amount of a card. Someone who types "voor de schoonmaker" in Waarvoor gets one
 * "voor", not "Betaal € 18 voor voor de schoonmaker" (Mo, R5-12).
 */
export function forPurpose(word: string, purpose: string | undefined): string {
    const rest = purpose
        ?.trim()
        .replace(new RegExp(`^${word}(?:\\s+|$)`, 'iu'), '')
        .trim();

    return rest === undefined || rest === '' ? '' : ` ${word} ${rest}`;
}

export const STRINGS: Record<Locale, RenderStrings> = {
    nl: {
        titleDeed: 'Eigendomsbewijs',
        rent: 'Huur',
        rentFullSet: 'Huur met kleurgroep',
        rentWithHouses: (count, house) =>
            `Huur met ${count} ${count === 1 ? house.singular : house.plural}`,
        rentWithHotel: (hotel) => `Huur met ${hotel.singular}`,
        rentStations: (count, station) =>
            `Huur met ${count} ${count === 1 ? station.singular : station.plural}`,
        utilityRent: (single, both, utility) =>
            `Bezit je één ${utility.singular}, dan betaalt een speler ${single} keer het aantal ogen. Bezit je er twee, dan is het ${both} keer.`,
        houseCost: (house) => `Kosten ${house.singular}`,
        hotelCost: (hotel) => `Kosten ${hotel.singular}`,
        perPiece: (amount) => `${amount} per stuk`,
        plusHouses: (house) => `(plus 4 ${house.plural})`,
        mortgage: 'Hypotheekwaarde',
        mortgageBack: (unmortgage) =>
            `Staat dit eigendom onder hypotheek, leg de kaart dan met deze kant naar boven. Aflossen kost ${unmortgage}: de hypotheek plus 10% rente.`,
        price: 'Prijs',
        startSalary: (amount, start = 'Start') =>
            `Ontvang ${amount} als je langs ${start} komt`,
        pay: (amount, purpose) =>
            `Betaal ${amount}${forPurpose('voor', purpose)}`,
        receive: (amount, purpose) =>
            `Ontvang ${amount}${forPurpose('voor', purpose)}`,
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
        rentFullSet: 'Rent with colour set',
        rentWithHouses: (count, house) =>
            `Rent with ${count} ${count === 1 ? house.singular : house.plural}`,
        rentWithHotel: (hotel) => `Rent with ${hotel.singular}`,
        rentStations: (count, station) =>
            `Rent with ${count} ${count === 1 ? station.singular : station.plural}`,
        utilityRent: (single, both, utility) =>
            `With one ${utility.singular}, a player pays ${single} times the dice roll. With both, it is ${both} times.`,
        houseCost: (house) => `${capitalize(house.plural)} cost`,
        hotelCost: (hotel) => `${capitalize(hotel.plural)} cost`,
        perPiece: (amount) => `${amount} each`,
        plusHouses: (house) => `(plus 4 ${house.plural})`,
        mortgage: 'Mortgage value',
        mortgageBack: (unmortgage) =>
            `While this property is mortgaged, keep the card with this side up. Paying it off costs ${unmortgage}: the mortgage plus 10% interest.`,
        price: 'Price',
        startSalary: (amount, start = 'Start') =>
            `Collect ${amount} when you pass ${start}`,
        pay: (amount, purpose) =>
            `Pay ${amount}${forPurpose('for', purpose)}`,
        receive: (amount, purpose) =>
            `Collect ${amount}${forPurpose('for', purpose)}`,
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

/** An edition's currency when it names none: euros in Dutch, pounds in English (B154). */
export { defaultCurrency } from '@/lib/game/currency';
