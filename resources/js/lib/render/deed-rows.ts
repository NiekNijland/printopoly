import type { CurrencyId, Locale, OwnableSpace } from '@/lib/game/types';

import { STRINGS } from './strings';
import {
    STANDARD_BUILDINGS,
    money as formatMoney,
    type RenderWords,
} from './words';

export interface DeedRow {
    label: string;
    value: string;
}

export interface DeedContent {
    rows: readonly DeedRow[];
    /** House and hotel cost per piece, under the rule (streets only). */
    costs: readonly DeedRow[];
    /** "(plus 4 huizen)" under the hotel cost; empty without costs. */
    costsNote: string;
    /** The rule for utilities, in place of a table; empty for streets and stations. */
    footer: string;
    mortgage: string;
    unmortgage: string;
}

/** Rent table and notes of a title deed, in the language and currency of the edition. */
export function deedContent(
    space: OwnableSpace,
    locale: Locale,
    currency: CurrencyId,
    words: RenderWords = {},
): DeedContent {
    const t = STRINGS[locale];
    const money = (amount: number) =>
        formatMoney(amount, currency, locale, words);
    const houseWord = words.house ?? STANDARD_BUILDINGS[locale].house;
    const hotelWord = words.hotel ?? STANDARD_BUILDINGS[locale].hotel;
    const stationWord = words.station ?? STANDARD_BUILDINGS[locale].station;
    const utilityWord = words.utility ?? STANDARD_BUILDINGS[locale].utility;
    const mortgage = money(space.mortgage);
    const unmortgage = money(Math.round((space.mortgage * 11) / 10));

    if (space.type === 'street') {
        const [base, one, two, three, four, hotel] = space.rent;

        return {
            rows: [
                { label: t.rent, value: money(base) },
                { label: t.rentFullSet, value: money(base * 2) },
                { label: t.rentWithHouses(1, houseWord), value: money(one) },
                { label: t.rentWithHouses(2, houseWord), value: money(two) },
                { label: t.rentWithHouses(3, houseWord), value: money(three) },
                { label: t.rentWithHouses(4, houseWord), value: money(four) },
                { label: t.rentWithHotel(hotelWord), value: money(hotel) },
            ],
            costs: [
                {
                    label: t.houseCost(houseWord),
                    value: t.perPiece(money(space.houseCost)),
                },
                {
                    label: t.hotelCost(hotelWord),
                    value: t.perPiece(money(space.houseCost)),
                },
            ],
            costsNote: t.plusHouses(houseWord),
            footer: '',
            mortgage,
            unmortgage,
        };
    }

    if (space.type === 'station') {
        return {
            rows: space.rent.map((amount, index) => ({
                label: t.rentStations(index + 1, stationWord),
                value: money(amount),
            })),
            costs: [],
            costsNote: '',
            footer: '',
            mortgage,
            unmortgage,
        };
    }

    return {
        rows: [],
        costs: [],
        costsNote: '',
        footer: t.utilityRent(
            space.multipliers[0],
            space.multipliers[1],
            utilityWord,
        ),
        mortgage,
        unmortgage,
    };
}
