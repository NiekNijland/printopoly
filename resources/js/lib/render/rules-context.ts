import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import {
    MONEY_PLAYERS,
    banknoteTotal,
    type MoneyAmount,
} from '@/lib/render/print-money';

import { DEFAULT_WORDS, type RulesContext } from './rules-booklet';

/** One rule per line, as the house rules card writes them; empty lines are dropped. */
function ruleLines(text: string | undefined): string[] {
    return (text ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
}

/**
 * What the rules booklet needs from an edition: its names and the house rules it keeps. The words for the
 * pieces (house, hotel, the corners and the two decks) are those of the edition, with the custom house and hotel words of B126; where it names none the
 * defaults of the language apply.
 */
export function rulesContext(
    resolved: ResolvedEdition,
    houseRules: string | undefined,
    /** The play money in the box (B156), when the edition prints it. */
    moneyAmount?: MoneyAmount,
    /** The edition prints no money at all: the booklet says it comes from your own game. */
    noMoney = false,
): RulesContext {
    const defaults = DEFAULT_WORDS[resolved.language];
    const named = (position: number, fallback: string): string => {
        const name = resolved.spaces[position]?.name.trim();

        return name === undefined || name === '' ? fallback : name;
    };
    const words = {
        ...defaults,
        // The edition's own words for houses and hotels (B126); the standard ones keep the booklet's wording.
        ...(resolved.words.custom.house
            ? {
                  house: resolved.words.house.singular,
                  houses: resolved.words.house.plural,
              }
            : {}),
        ...(resolved.words.custom.hotel
            ? {
                  hotel: resolved.words.hotel.singular,
                  hotels: resolved.words.hotel.plural,
              }
            : {}),
        // Stations and utilities as the edition calls them (B172), also in the price list.
        station: resolved.words.station.singular,
        stations: resolved.words.station.plural,
        utility: resolved.words.utility.singular,
        utilities: resolved.words.utility.plural,
        // The edition's own words everywhere (bug 17 of test round 3): the jail in a sentence, the decks, the corners.
        jail: resolved.words.custom.jail ? resolved.words.jail : defaults.jail,
        start: named(0, defaults.start),
        chest: resolved.words.custom.chest
            ? resolved.words.decks.chest
            : named(2, defaults.chest),
        chance: resolved.words.custom.chance
            ? resolved.words.decks.chance
            : named(7, defaults.chance),
        parking: named(20, defaults.parking),
        goToJail: named(30, defaults.goToJail),
    };

    return {
        locale: resolved.language,
        currency: resolved.currency.id,
        ...(resolved.words.customSymbol === undefined
            ? {}
            : { symbol: resolved.words.customSymbol }),
        ...(noMoney ? { noMoney: true } : {}),
        ...(moneyAmount === undefined
            ? {}
            : {
                  money: {
                      notes: banknoteTotal(moneyAmount),
                      maxPlayers: MONEY_PLAYERS[moneyAmount].max,
                  },
              }),
        name: resolved.name,
        words,
        spaceNames: resolved.spaces.map((space) => space.name),
        spaces: resolved.spaces.map((space) => space.base),
        ...(resolved.decks === null
            ? {}
            : {
                  cards: {
                      chance: resolved.decks.chance.length,
                      chest: resolved.decks.chest.length,
                  },
              }),
        houseRules: ruleLines(houseRules),
        groupTowns: Object.fromEntries(
            resolved.groups.flatMap((group) =>
                group.town === undefined ? [] : [[group.id, group.town]],
            ),
        ),
    };
}
