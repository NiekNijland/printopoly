import { standardEdition } from '@/lib/render/standard-edition';
import type { GroupId, OwnableSpace } from '@/types/game';

import type { PriceListPage, RulesContext } from './rules-booklet';
import {
    capitalize,
    plain,
    stations,
    streets,
    utilities,
} from './rules-booklet-facts';

export const priceList = (
    ctx: RulesContext,
    kicker: string,
    title: string,
    ids: (GroupId | 'station' | 'utility')[],
    note: string,
): PriceListPage => {
    const { locale } = ctx;
    // The edition's own sign and word for a hotel head the columns (bug 7 and 17 of test round 3).
    const symbol =
        ctx.symbol ??
        standardEdition.currencies.find((entry) => entry.id === ctx.currency)
            ?.symbol ??
        '';
    const hotel = capitalize(ctx.words.hotel);
    const heads =
        locale === 'nl'
            ? {
                  name: 'Straat',
                  price: `Prijs ${symbol}`,
                  rent: 'Huur',
                  hotel,
                  house: 'Bouwen',
                  mortgage: 'Hypotheek',
              }
            : {
                  name: 'Street',
                  price: `Price ${symbol}`,
                  rent: 'Rent',
                  hotel,
                  house: 'Build',
                  mortgage: 'Mortgage',
              };
    const groupLabel = (id: GroupId | 'station' | 'utility'): string => {
        if (id === 'station') {
            return capitalize(ctx.words.stations);
        }

        if (id === 'utility') {
            return capitalize(ctx.words.utilities);
        }

        return (
            ctx.groupTowns?.[id] ??
            standardEdition.groups.find((group) => group.id === id)?.name[
                locale
            ] ??
            id
        );
    };
    const nameOf = (space: OwnableSpace): string =>
        ctx.spaceNames[space.position] ?? space.name[locale];

    return {
        kind: 'prices',
        kicker,
        title,
        heads,
        note,
        groups: ids.map((id) => priceGroup(ctx, id, groupLabel(id), nameOf)),
    };
};

const priceGroup = (
    ctx: RulesContext,
    id: GroupId | 'station' | 'utility',
    label: string,
    nameOf: (space: OwnableSpace) => string,
): PriceListPage['groups'][number] => {
    const { locale } = ctx;

    if (id === 'station') {
        return {
            id,
            label,
            rows: stations(ctx.spaces).map((space) => ({
                name: nameOf(space),
                group: id,
                price: plain(space.price, locale),
                rent: space.rent
                    .map((value) => plain(value, locale))
                    .join(' / '),
                hotel: '',
                house: '',
                mortgage: plain(space.mortgage, locale),
            })),
        };
    }

    if (id === 'utility') {
        return {
            id,
            label,
            rows: utilities(ctx.spaces).map((space) => ({
                name: nameOf(space),
                group: id,
                price: plain(space.price, locale),
                rent: `${String(space.multipliers[0])}× / ${String(space.multipliers[1])}×`,
                hotel: '',
                house: '',
                mortgage: plain(space.mortgage, locale),
            })),
        };
    }

    return {
        id,
        label,
        rows: streets(ctx.spaces)
            .filter((space) => space.group === id)
            .map((space) => ({
                name: nameOf(space),
                group: id,
                price: plain(space.price, locale),
                rent: plain(space.rent[0], locale),
                hotel: plain(space.rent[5], locale),
                house: plain(space.houseCost, locale),
                mortgage: plain(space.mortgage, locale),
            })),
    };
};
