import data from '../../../data/standard-edition.json';
import type {
    CornerSpace,
    CurrencyId,
    GroupId,
    Locale,
    OwnableSpace,
    Space,
    SpacesBySide,
    StandardEdition,
    StationRent,
    StreetRent,
    StreetSpace,
} from './types';

export const standardEdition = data as unknown as StandardEdition;

export function spaceAt(position: number): Space {
    const space = standardEdition.spaces[position];

    if (space === undefined || space.position !== position) {
        throw new RangeError(`No space at position ${position}`);
    }

    return space;
}

export function isOwnable(space: Space): space is OwnableSpace {
    return space.type === 'street' || space.type === 'station' || space.type === 'utility';
}

/** Rent table of a street (6 values) or a station (4 values). Throws for other spaces. */
export function rentTable(position: number): StreetRent | StationRent {
    const space = spaceAt(position);

    if (space.type === 'street' || space.type === 'station') {
        return space.rent;
    }

    throw new TypeError(`Space ${position} has no rent table`);
}

/** Rent of an unimproved street when the owner has the whole colour group: twice the base rent. */
export function setRent(position: number): number {
    const space = spaceAt(position);

    if (space.type !== 'street') {
        throw new TypeError(`Space ${position} is not a street`);
    }

    return space.rent[0] * 2;
}

function ownableAt(position: number): OwnableSpace {
    const space = spaceAt(position);

    if (!isOwnable(space)) {
        throw new TypeError(`Space ${position} cannot be mortgaged`);
    }

    return space;
}

export function mortgage(position: number): number {
    return ownableAt(position).mortgage;
}

/** Mortgage plus 10%, rounded to a whole amount. */
export function unmortgage(position: number): number {
    return Math.round((mortgage(position) * 11) / 10);
}

/** The 36 non-corner spaces per side of the board, plus the four corners. */
export function spacesBySide(): SpacesBySide {
    const spaces = standardEdition.spaces;

    return {
        corners: spaces.filter((space): space is CornerSpace => space.type === 'corner'),
        bottom: spaces.slice(1, 10),
        left: spaces.slice(11, 20),
        top: spaces.slice(21, 30),
        right: spaces.slice(31, 40),
    };
}

export function groupMembers(group: GroupId): StreetSpace[] {
    return standardEdition.spaces.filter((space): space is StreetSpace => space.type === 'street' && space.group === group);
}

/** The 28 ownable spaces, in board order. */
export function deedsFor(): OwnableSpace[] {
    return standardEdition.spaces.filter(isOwnable);
}

const numberLocale: Record<Locale, string> = { nl: 'nl-NL', en: 'en-GB' };

/** `€ 1.500` in Dutch, `€1,500` in English. */
export function formatMoney(amount: number, currency: CurrencyId, locale: Locale): string {
    const entry = standardEdition.currencies.find((candidate) => candidate.id === currency);

    if (entry === undefined) {
        throw new RangeError(`Unknown currency ${currency}`);
    }

    const number = new Intl.NumberFormat(numberLocale[locale], { maximumFractionDigits: 0 }).format(amount);

    return locale === 'nl' ? `${entry.symbol} ${number}` : `${entry.symbol}${number}`;
}
