import type { CurrencyId, Locale } from '@/lib/game/types';

/** Default texts on the printed elements, per language. Names and card texts come from the game data. */
export interface RenderStrings {
    titleDeed: string;
    rent: string;
    rentFullSet: string;
    rentWithHouses: (count: number) => string;
    rentWithHotel: string;
    rentStations: (count: number) => string;
    utilityRent: (single: number, both: number) => string;
    houseAndHotel: (house: string, hotel: string) => string;
    mortgage: string;
    mortgageBack: (unmortgage: string) => string;
    price: string;
    startSalary: (amount: string) => string;
    pay: (amount: string) => string;
    justVisiting: string;
    inJail: string;
    parkingAlt: string;
    playMoney: string;
    pawn: string;
    boxLidSubtitle: string;
    cardSpot: string;
}

export const STRINGS: Record<Locale, RenderStrings> = {
    nl: {
        titleDeed: 'Eigendomsbewijs',
        rent: 'Huur',
        rentFullSet: 'Hele kleur in bezit',
        rentWithHouses: (count) => (count === 1 ? 'Met 1 huis' : `Met ${count} huizen`),
        rentWithHotel: 'Met hotel',
        rentStations: (count) => (count === 1 ? 'Huur met 1 station' : `Huur met ${count} stations`),
        utilityRent: (single, both) =>
            `Bezit je één nutsbedrijf, dan betaalt een speler ${single} keer het aantal ogen. Bezit je er twee, dan is het ${both} keer.`,
        houseAndHotel: (house, hotel) => `Huis ${house} · hotel ${hotel} plus 4 huizen`,
        mortgage: 'Hypotheek',
        mortgageBack: (unmortgage) =>
            `Leg deze kaart omgedraaid neer zolang hij verhypothekeerd is. Aflossen kost ${unmortgage}.`,
        price: 'Prijs',
        startSalary: (amount) => `Ontvang ${amount} als je langs Start komt`,
        pay: (amount) => `Betaal ${amount}`,
        justVisiting: 'Op bezoek',
        inJail: 'In de cel',
        parkingAlt: 'Parkeren',
        playMoney: 'speelgeld',
        pawn: 'Pion',
        boxLidSubtitle: 'Een spel voor 2 tot 8 spelers',
        cardSpot: 'Kaartvak',
    },
    en: {
        titleDeed: 'Title deed',
        rent: 'Rent',
        rentFullSet: 'Whole colour owned',
        rentWithHouses: (count) => (count === 1 ? 'With 1 house' : `With ${count} houses`),
        rentWithHotel: 'With hotel',
        rentStations: (count) => (count === 1 ? 'Rent with 1 station' : `Rent with ${count} stations`),
        utilityRent: (single, both) =>
            `With one utility, a player pays ${single} times the dice roll. With both, it is ${both} times.`,
        houseAndHotel: (house, hotel) => `House ${house} · hotel ${hotel} plus 4 houses`,
        mortgage: 'Mortgage',
        mortgageBack: (unmortgage) =>
            `Keep this card face down while it is mortgaged. Paying it off costs ${unmortgage}.`,
        price: 'Price',
        startSalary: (amount) => `Collect ${amount} when you pass Start`,
        pay: (amount) => `Pay ${amount}`,
        justVisiting: 'Just visiting',
        inJail: 'In jail',
        parkingAlt: 'Parking',
        playMoney: 'play money',
        pawn: 'Pawn',
        boxLidSubtitle: 'A game for 2 to 8 players',
        cardSpot: 'Card spot',
    },
};

/** An edition's currency when it names none: euros in Dutch, play money (M) in English. */
export function defaultCurrency(locale: Locale): CurrencyId {
    return locale === 'nl' ? 'eur' : 'play';
}
