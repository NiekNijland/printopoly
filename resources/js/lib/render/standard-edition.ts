import { formatNumber } from '@/lib/number-format';
import type {
    CurrencyId,
    Locale,
    OwnableSpace,
    Space,
    StandardEdition,
} from '../../types/game';

const [data] = Object.values(
    import.meta.glob<StandardEdition>('../../../data/standard-edition.json', {
        eager: true,
        import: 'default',
    }),
);

if (data === undefined) {
    throw new Error('The standard edition is missing');
}

export const standardEdition: StandardEdition = data;

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
