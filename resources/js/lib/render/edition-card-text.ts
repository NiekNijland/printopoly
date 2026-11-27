import { formatNumber } from '@/lib/number-format';
import { formatMoney, standardEdition } from '@/lib/render/standard-edition';
import { STANDARD_BUILDINGS } from '@/lib/render/words';
import type { Locale } from '@/types/game';
import { spaceKey } from './edition-keys';
import type { Edition } from './edition-types';
import { STANDARD_JAIL, type ResolvedWords } from './edition-words';

/**
 * Variables in card texts (B131).
 *
 * A stored card text is plain text with tokens in curly braces:
 *
 * - `{space:24}`: the name of the space at board position 24, as it is called now. Renaming the
 *   space, or swapping names, changes the card with it. Positions are the 0 to 39 of
 *   `standard-edition.json`, written without leading zeros.
 * - `{currency}`: the symbol of the edition currency, such as `€`.
 * - `{amount}`: the amount of the card, when one is set.
 * - `{station}`, `{utility}`, `{house}`, `{hotel}`, `{jail}` and the plurals `{stations}`, `{utilities}`,
 *   `{houses}`, `{hotels}`: the word the edition uses for it (B172, B177), such as "bushalte".
 *
 * A token is `{`, a name of lowercase letters, an optional `:` with a value, and `}`. Anything
 * between braces that looks like a token but is not one the editor knows (`{foo}`, `{space:99}`,
 * `{space:07}`) is an unknown token: it is shown as typed, so it is visible and harmless, and the
 * Controle warns about it. Braces that do not look like a token stay plain text. There is no
 * escape: write `{` and `}` in another way when you need a lookalike.
 *
 * `serializeCardText(parseCardText(text)) === text` holds for every string.
 */
export type CardTextSegment =
    | { type: 'text'; text: string }
    | { type: 'space'; position: number }
    | { type: 'currency' }
    | { type: 'amount' }
    | { type: 'word'; word: CardTextWord }
    | { type: 'unknown'; raw: string };

/** The words of an edition a card text can hold as a variable (B177). */
const CARD_TEXT_WORDS = [
    'station',
    'stations',
    'utility',
    'utilities',
    'house',
    'houses',
    'hotel',
    'hotels',
    'jail',
] as const;

export type CardTextWord = (typeof CARD_TEXT_WORDS)[number];

const WORDS: ReadonlySet<string> = new Set(CARD_TEXT_WORDS);

const isCardTextWord = (name: string): name is CardTextWord => {
    return WORDS.has(name);
};

export const wordToken = (word: CardTextWord): string => {
    return `{${word}}`;
};

export type CardTextToken = Exclude<CardTextSegment, { type: 'text' }>;

const TOKEN = /\{([a-z]+)(?::([0-9a-z_-]*))?\}/g;
const POSITION = /^(0|[1-9]\d*)$/;

const POSITIONS: ReadonlySet<number> = new Set(
    standardEdition.spaces.map((space) => space.position),
);

export const CURRENCY_TOKEN = '{currency}';
export const AMOUNT_TOKEN = '{amount}';

export const spaceToken = (position: number): string => {
    return `{space:${String(position)}}`;
};

const tokenOf = (raw: string, name: string, value: string | undefined) => {
    if (name === 'currency' && value === undefined) {
        return { type: 'currency' } as const;
    }
    if (name === 'amount' && value === undefined) {
        return { type: 'amount' } as const;
    }
    if (value === undefined && isCardTextWord(name)) {
        return { type: 'word', word: name } as const;
    }
    if (
        name === 'space' &&
        value !== undefined &&
        POSITION.test(value) &&
        POSITIONS.has(Number(value))
    ) {
        return { type: 'space', position: Number(value) } as const;
    }

    return { type: 'unknown', raw } as const;
};

export const parseCardText = (text: string): CardTextSegment[] => {
    const segments: CardTextSegment[] = [];
    let last = 0;

    for (const match of text.matchAll(TOKEN)) {
        const start = match.index;
        if (start > last) {
            segments.push({ type: 'text', text: text.slice(last, start) });
        }
        segments.push(tokenOf(match[0], match[1] ?? '', match[2]));
        last = start + match[0].length;
    }
    if (last < text.length) {
        segments.push({ type: 'text', text: text.slice(last) });
    }

    return segments;
};

export const serializeToken = (token: CardTextToken): string => {
    switch (token.type) {
        case 'space':
            return spaceToken(token.position);
        case 'currency':
            return CURRENCY_TOKEN;
        case 'amount':
            return AMOUNT_TOKEN;
        case 'word':
            return wordToken(token.word);
        case 'unknown':
            return token.raw;
    }
};

const serializeCardText = (segments: readonly CardTextSegment[]): string => {
    return segments
        .map((segment) =>
            segment.type === 'text' ? segment.text : serializeToken(segment),
        )
        .join('');
};

/** What the tokens of a text turn into. */
export type CardTextContext = {
    /** Current name of the space, or `undefined` for a position that does not exist. */
    spaceName: (position: number) => string | undefined;
    currencySymbol: string;
    amount: number | undefined;
    locale: Locale;
    /**
     * The amount as money with the currency sign ("dk 50"), for an `{amount}` that has no `{currency}` before
     * it (round 4, bug 4). Left out, `{amount}` is the bare number.
     */
    money?: (amount: number) => string;
    /** The word of the edition for a word variable, such as "bushalte" for `{station}`. */
    word: (word: CardTextWord) => string;
};

/** The words a card text can name, singular and plural (B177). */
export type CardTextWords = Pick<
    ResolvedWords,
    'house' | 'hotel' | 'station' | 'utility' | 'jail'
>;

/** The word for a word variable. */
export const wordOf = (words: CardTextWords, word: CardTextWord): string => {
    switch (word) {
        case 'station':
            return words.station.singular;
        case 'stations':
            return words.station.plural;
        case 'utility':
            return words.utility.singular;
        case 'utilities':
            return words.utility.plural;
        case 'house':
            return words.house.singular;
        case 'houses':
            return words.house.plural;
        case 'hotel':
            return words.hotel.singular;
        case 'hotels':
            return words.hotel.plural;
        case 'jail':
            return words.jail;
    }
};

const numberLocale: Record<Locale, string> = { nl: 'nl-NL', en: 'en-GB' };

/** The text of a token as it is printed; `undefined` when it cannot be filled in. */
export const tokenValue = (
    token: CardTextToken,
    context: CardTextContext,
): string | undefined => {
    switch (token.type) {
        case 'space':
            return context.spaceName(token.position);
        case 'currency':
            return context.currencySymbol;
        case 'amount':
            return context.amount === undefined
                ? undefined
                : // "Pay {amount}" never reads "Pay -15": the sign only says which way the money goes.
                  formatNumber(
                      Math.abs(context.amount),
                      numberLocale[context.locale],
                      { maximumFractionDigits: 2 },
                  );
        case 'word':
            return context.word(token.word);
        case 'unknown':
            return undefined;
    }
};

/** Whether the `{amount}` at `index` already has a currency sign before it: `{currency} {amount}` or "€ {amount}". */
const hasCurrencyBefore = (
    segments: readonly CardTextSegment[],
    index: number,
    symbol: string,
): boolean => {
    const before = segments[index - 1];
    if (before?.type === 'currency') {
        return true;
    }
    if (before?.type !== 'text') {
        return false;
    }
    const rest = before.text.trimEnd();

    return (
        (rest === '' && segments[index - 2]?.type === 'currency') ||
        (symbol !== '' && rest.endsWith(symbol)) ||
        /[€$£¤]$/u.test(rest)
    );
};

/**
 * The text as it is printed. A token that cannot be filled in (unknown, or `{amount}` on a card
 * without an amount) stays as typed. An `{amount}` without a currency sign before it gets one, so
 * "Betaal {amount}" reads "Betaal dk 50" like the standard cards (round 4, bug 4).
 */
export const renderCardText = (
    text: string,
    context: CardTextContext,
): string => {
    const segments = parseCardText(text);
    let printed = '';

    segments.forEach((segment, index) => {
        if (
            segment.type === 'amount' &&
            context.amount !== undefined &&
            context.money !== undefined &&
            !hasCurrencyBefore(segments, index, context.currencySymbol)
        ) {
            printed += context.money(Math.abs(context.amount));
        } else if (segment.type === 'space') {
            const name = tokenValue(segment, context);
            printed +=
                name === undefined
                    ? serializeToken(segment)
                    : articleInSentence(name, printed);
        } else if (segment.type !== 'text') {
            printed += tokenValue(segment, context) ?? serializeToken(segment);
        } else {
            // "{currency} 200": the sign stays on the line of its number, as formatMoney does (bug 26).
            printed +=
                segments[index - 1]?.type === 'currency'
                    ? segment.text.replace(/^ (?=\d|$)/, '\u00a0')
                    : segment.text;
        }
    });

    return printed;
};

/** "The", "De" and "Het" before a name written in sentence case: "The wedding car", "De proeverij". */
const LEADING_ARTICLE = /^(The|De|Het)(?= \p{Ll})/u;

/**
 * A space name in the middle of a sentence loses the capital of its article: "Go to the wedding car", "Ga naar de
 * proeverij" (R6 Tom). Only a name in sentence case changes; a name that capitalises the word after the article
 * ("The Hague", "De Smederij") is a proper name and stays as it is, and so does a name at the start of a sentence.
 */
const articleInSentence = (name: string, before: string): string => {
    const rest = before.trimEnd();
    if (rest === '' || /[.!?:;]["'\u201d\u2019)]*$/u.test(rest)) {
        return name;
    }

    return name.replace(LEADING_ARTICLE, (article) => article.toLowerCase());
};

/** Current name of a space: its override, else the standard name in the language of the edition. */
export const spaceNameOf = (
    edition: Pick<Edition, 'elements' | 'language'>,
    position: number,
): string | undefined => {
    const space = standardEdition.spaces.find(
        (candidate) => candidate.position === position,
    );
    if (space === undefined) {
        return undefined;
    }
    const override = edition.elements[spaceKey(position)]?.name?.trim();

    return override === undefined || override === ''
        ? space.name[edition.language]
        : override;
};

export const cardTextContext = (
    edition: Pick<Edition, 'elements' | 'language' | 'currency'>,
    amount: number | undefined,
    /** The symbol the edition chose for its currency (a custom word), instead of the standard one. */
    symbol?: string,
    /** The words of the edition; the standard words of its language when left out. */
    words?: CardTextWords,
): CardTextContext => {
    const currency = standardEdition.currencies.find(
        (candidate) => candidate.id === edition.currency,
    );
    const filled: CardTextWords = words ?? {
        ...STANDARD_BUILDINGS[edition.language],
        jail: STANDARD_JAIL[edition.language],
    };

    return {
        spaceName: (position) => spaceNameOf(edition, position),
        currencySymbol: symbol ?? currency?.symbol ?? '',
        amount,
        locale: edition.language,
        word: (word) => wordOf(filled, word),
        ...(currency === undefined
            ? {}
            : {
                  money: (value: number) =>
                      formatMoney(value, currency.id, edition.language, symbol),
              }),
    };
};

/** Applies `change` to the plain text between the tokens of a text; the tokens stay as they are. */
export const mapCardTextSegments = (
    text: string,
    change: (plain: string) => string,
): string => {
    return serializeCardText(
        parseCardText(text).map((segment) =>
            segment.type === 'text'
                ? { type: 'text', text: change(segment.text) }
                : segment,
        ),
    );
};
