import type { ResolvedEdition } from '@/lib/edition/resolve';

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
        start: named(0, defaults.start),
        chest: named(2, defaults.chest),
        chance: named(7, defaults.chance),
    };

    return {
        locale: resolved.language,
        currency: resolved.currency.id,
        name: resolved.name,
        words,
        spaceNames: resolved.spaces.map((space) => space.name),
        spaces: resolved.spaces.map((space) => space.base),
        houseRules: ruleLines(houseRules),
        groupTowns: Object.fromEntries(
            resolved.groups.flatMap((group) =>
                group.town === undefined ? [] : [[group.id, group.town]],
            ),
        ),
    };
}
