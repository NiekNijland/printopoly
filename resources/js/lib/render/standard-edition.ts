import { formatNumber } from '@/lib/number-format';
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
} from '../../types/game';

export const standardEdition = data as unknown as StandardEdition;

export const spaceAt = (position: number): Space => {
    const space = standardEdition.spaces[position];

    if (space === undefined || space.position !== position) {
        throw new RangeError(`No space at position ${position}`);
    }

    return space;
};

export const isOwnable = (space: Space): space is OwnableSpace => {
    return (
        space.type === 'street' ||
        space.type === 'station' ||
        space.type === 'utility'
    );
};

/** Rent table of a street (6 values) or a station (4 values). Throws for other spaces. */
export const rentTable = (position: number): StreetRent | StationRent => {
    const space = spaceAt(position);

    if (space.type === 'street' || space.type === 'station') {
        return space.rent;
    }

    throw new TypeError(`Space ${position} has no rent table`);
};

/** Rent of an unimproved street when the owner has the whole colour group: twice the base rent. */
export const setRent = (position: number): number => {
    const space = spaceAt(position);

    if (space.type !== 'street') {
        throw new TypeError(`Space ${position} is not a street`);
    }

    return space.rent[0] * 2;
};

const ownableAt = (position: number): OwnableSpace => {
    const space = spaceAt(position);

    if (!isOwnable(space)) {
        throw new TypeError(`Space ${position} cannot be mortgaged`);
    }

    return space;
};

export const mortgage = (position: number): number => {
    return ownableAt(position).mortgage;
};

/** Mortgage plus 10%, rounded to a whole amount. */
export const unmortgage = (position: number): number => {
    return Math.round((mortgage(position) * 11) / 10);
};

/** The 36 non-corner spaces per side of the board, plus the four corners. */
export const spacesBySide = (): SpacesBySide => {
    const spaces = standardEdition.spaces;

    return {
        corners: spaces.filter(
            (space): space is CornerSpace => space.type === 'corner',
        ),
        bottom: spaces.slice(1, 10),
        left: spaces.slice(11, 20),
        top: spaces.slice(21, 30),
        right: spaces.slice(31, 40),
    };
};

export const groupMembers = (group: GroupId): StreetSpace[] => {
    return standardEdition.spaces.filter(
        (space): space is StreetSpace =>
            space.type === 'street' && space.group === group,
    );
};

/** The 28 ownable spaces, in board order. */
export const deedsFor = (): OwnableSpace[] => {
    return standardEdition.spaces.filter(isOwnable);
};

const numberLocale: Record<Locale, string> = { nl: 'nl-NL', en: 'en-GB' };

/**
 * Puts the currency sign before every amount in a standard card text ("pay 15" becomes "pay M15" or
 * "betaal € 15"). A multiplier of the dice ("10 keer", "10 times") is not an amount and stays a number.
 */
export const withCurrency = (
    text: string,
    currency: CurrencyId,
    locale: Locale,
    symbol?: string,
): string => {
    return text.replace(
        /(?<![\w.,])(\d+)(?!\w|[.,]\d|\s+(?:keer|times)\b)/g,
        (_, digits: string) =>
            formatMoney(Number(digits), currency, locale, symbol),
    );
};

/** `€ 1.500` in Dutch, `€1,500` in English. An edition's own `symbol` replaces the one of the currency. */
export const formatMoney = (
    amount: number,
    currency: CurrencyId,
    locale: Locale,
    symbol?: string,
): string => {
    const entry = standardEdition.currencies.find(
        (candidate) => candidate.id === currency,
    );

    if (entry === undefined) {
        throw new RangeError(`Unknown currency ${currency}`);
    }

    const number = formatNumber(amount, numberLocale[locale], {
        maximumFractionDigits: 0,
    });

    const sign = symbol ?? entry.symbol;

    // A symbol of letters ("RP") is set off with a space in English too, the way a currency code is. The space
    // does not break, so "€" never ends a line with the amount on the next (bug 26 of test round 3).
    return locale === 'nl' || (symbol !== undefined && /\p{L}$/u.test(sign))
        ? `${sign}\u00A0${number}`
        : `${sign}${number}`;
};
