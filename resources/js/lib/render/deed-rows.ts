import { formatMoney } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale, OwnableSpace } from '@/lib/game/types';

import { STRINGS } from './strings';

export interface DeedRow {
    label: string;
    value: string;
}

export interface DeedContent {
    rows: readonly DeedRow[];
    /** Text under the table: house and hotel costs, or the rule for utilities. */
    footer: string;
    mortgage: string;
    unmortgage: string;
}

/** Rent table and notes of a title deed, in the language and currency of the edition. */
export function deedContent(space: OwnableSpace, locale: Locale, currency: CurrencyId): DeedContent {
    const t = STRINGS[locale];
    const money = (amount: number) => formatMoney(amount, currency, locale);
    const mortgage = money(space.mortgage);
    const unmortgage = money(Math.round((space.mortgage * 11) / 10));

    if (space.type === 'street') {
        const [base, one, two, three, four, hotel] = space.rent;

        return {
            rows: [
                { label: t.rent, value: money(base) },
                { label: t.rentFullSet, value: money(base * 2) },
                { label: t.rentWithHouses(1), value: money(one) },
                { label: t.rentWithHouses(2), value: money(two) },
                { label: t.rentWithHouses(3), value: money(three) },
                { label: t.rentWithHouses(4), value: money(four) },
                { label: t.rentWithHotel, value: money(hotel) },
            ],
            footer: t.houseAndHotel(money(space.houseCost), money(space.houseCost)),
            mortgage,
            unmortgage,
        };
    }

    if (space.type === 'station') {
        return {
            rows: space.rent.map((amount, index) => ({ label: t.rentStations(index + 1), value: money(amount) })),
            footer: '',
            mortgage,
            unmortgage,
        };
    }

    return {
        rows: [],
        footer: t.utilityRent(space.multipliers[0], space.multipliers[1]),
        mortgage,
        unmortgage,
    };
}
