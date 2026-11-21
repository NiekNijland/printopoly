import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { spaceKey } from './keys';
import type { Edition } from './types';

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
    | { type: 'unknown'; raw: string };

export type CardTextToken = Exclude<CardTextSegment, { type: 'text' }>;

const TOKEN = /\{([a-z]+)(?::([0-9a-z_-]*))?\}/g;
const POSITION = /^(0|[1-9]\d*)$/;

const POSITIONS: ReadonlySet<number> = new Set(
    standardEdition.spaces.map((space) => space.position),
);

export const CURRENCY_TOKEN = '{currency}';
export const AMOUNT_TOKEN = '{amount}';

export function spaceToken(position: number): string {
    return `{space:${String(position)}}`;
}

function tokenOf(raw: string, name: string, value: string | undefined) {
    if (name === 'currency' && value === undefined) {
        return { type: 'currency' } as const;
    }
    if (name === 'amount' && value === undefined) {
        return { type: 'amount' } as const;
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
}

export function parseCardText(text: string): CardTextSegment[] {
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
}

export function serializeToken(token: CardTextToken): string {
    switch (token.type) {
        case 'space':
            return spaceToken(token.position);
        case 'currency':
            return CURRENCY_TOKEN;
        case 'amount':
            return AMOUNT_TOKEN;
        case 'unknown':
            return token.raw;
    }
}

export function serializeCardText(
    segments: readonly CardTextSegment[],
): string {
    return segments
        .map((segment) =>
            segment.type === 'text' ? segment.text : serializeToken(segment),
        )
        .join('');
}

/** What the tokens of a text turn into. */
export interface CardTextContext {
    /** Current name of the space, or `undefined` for a position that does not exist. */
    spaceName: (position: number) => string | undefined;
    currencySymbol: string;
    amount: number | undefined;
    locale: Locale;
}

const numberLocale: Record<Locale, string> = { nl: 'nl-NL', en: 'en-GB' };

/** The text of a token as it is printed; `undefined` when it cannot be filled in. */
export function tokenValue(
    token: CardTextToken,
    context: CardTextContext,
): string | undefined {
    switch (token.type) {
        case 'space':
            return context.spaceName(token.position);
        case 'currency':
            return context.currencySymbol;
        case 'amount':
            return context.amount === undefined
                ? undefined
                : new Intl.NumberFormat(numberLocale[context.locale], {
                      maximumFractionDigits: 2,
                      // "Pay {amount}" never reads "Pay -15": the sign only says which way the money goes.
                  }).format(Math.abs(context.amount));
        case 'unknown':
            return undefined;
    }
}

/**
 * The text as it is printed. A token that cannot be filled in (unknown, or `{amount}` on a card
 * without an amount) stays as typed.
 */
export function renderCardText(text: string, context: CardTextContext): string {
    const segments = parseCardText(text);

    return segments
        .map((segment, index) => {
            if (segment.type !== 'text') {
                return tokenValue(segment, context) ?? serializeToken(segment);
            }
            // "{currency} 200": the sign stays on the line of its number, as formatMoney does (bug 26).
            return segments[index - 1]?.type === 'currency'
                ? segment.text.replace(/^ (?=\d|$)/, '\u00a0')
                : segment.text;
        })
        .join('');
}

/** Current name of a space: its override, else the standard name in the language of the edition. */
export function spaceNameOf(
    edition: Pick<Edition, 'elements' | 'language'>,
    position: number,
): string | undefined {
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
}

export function cardTextContext(
    edition: Pick<Edition, 'elements' | 'language' | 'currency'>,
    amount: number | undefined,
    /** The symbol the edition chose for its currency (a custom word), instead of the standard one. */
    symbol?: string,
): CardTextContext {
    const currency = standardEdition.currencies.find(
        (candidate) => candidate.id === edition.currency,
    );

    return {
        spaceName: (position) => spaceNameOf(edition, position),
        currencySymbol: symbol ?? currency?.symbol ?? '',
        amount,
        locale: edition.language,
    };
}

/** Applies `change` to the plain text between the tokens of a text; the tokens stay as they are. */
export function mapCardTextSegments(
    text: string,
    change: (plain: string) => string,
): string {
    return serializeCardText(
        parseCardText(text).map((segment) =>
            segment.type === 'text'
                ? { type: 'text', text: change(segment.text) }
                : segment,
        ),
    );
}

export type CardTextProblem =
    | { kind: 'unknown-token'; token: string }
    | { kind: 'amount-missing' }
    /** The text spells out the amount that the amount line under it prints as well. */
    | { kind: 'amount-twice'; amount: number }
    /** The text names an amount of money that is not the amount printed under it (bug 8, ronde 3). */
    | { kind: 'amount-differs'; mentioned: number }
    | { kind: 'stale-name'; was: string; now: string };

/** Whether the text holds the amount as a number of its own ("Betaal 50"), not as a part of a bigger number. */
function mentionsAmount(plain: string, amount: number): boolean {
    const digits = String(Math.abs(amount));
    const formatted = new Set([
        digits,
        new Intl.NumberFormat('nl-NL').format(Math.abs(amount)),
        new Intl.NumberFormat('en-GB').format(Math.abs(amount)),
    ]);

    return [...formatted].some((form) =>
        new RegExp(`(?<![\\d.,])${escapeRegExp(form)}(?!\\d|[.,]\\d)`).test(
            plain,
        ),
    );
}

/** Stands in for the currency token in the plain text, so "{currency} 15" still reads as money. */
const CURRENCY_MARK = '¤';

/** Words after which a number is money: "Betaal 15", "Ontvang van de bank 15", "Collect 15". */
const MONEY_WORDS =
    /(?:^|[^\p{L}])(?:betaal|betaalt|betalen|ontvang|ontvangt|ontvangen|krijg|krijgt|krijgen|geef|geeft|geven|kost|kosten|boete|pay|pays|collect|collects|receive|receives|get|gets|give|gives|cost|costs|fine)(?:\s+[^\s\d]+){0,3}\s*$/iu;

/** A currency sign right before the number: "€ 15", "£15", "M 15", or the currency token. */
const MONEY_SIGN = /(?:[€$£¤]|(?:^|\s)M)\s*$/u;

/**
 * The amounts of money a text names, as positive numbers: a number after a currency sign or after a word
 * like "betaal" or "collect". Numbers that are not money ("Ga 3 vakjes terug", "groep 6") do not count.
 */
function moneyInText(plain: string): number[] {
    const found: number[] = [];
    const number =
        /(?<![\p{L}\p{N}.,])(\d{1,3}(?:[.,]\d{3})+|\d+)(?![\p{L}\p{N}]|[.,]\d)/gu;
    for (const match of plain.matchAll(number)) {
        const before = plain.slice(Math.max(0, match.index - 40), match.index);
        if (MONEY_SIGN.test(before) || MONEY_WORDS.test(before)) {
            found.push(Number((match[1] ?? '').replace(/[.,]/g, '')));
        }
    }

    return found;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * What the Controle has to say about a card text: tokens that are unknown, `{amount}` without an
 * amount, and a plain-text mention of a standard name of a space that has been renamed since
 * (the text predates the variables and would stay behind on a rename).
 */
export function cardTextProblems(
    text: string,
    edition: Pick<Edition, 'elements' | 'language'>,
    amount: number | undefined,
): CardTextProblem[] {
    const segments = parseCardText(text);
    const problems: CardTextProblem[] = [];
    const seen = new Set<string>();

    for (const segment of segments) {
        if (segment.type === 'unknown' && !seen.has(segment.raw)) {
            seen.add(segment.raw);
            problems.push({ kind: 'unknown-token', token: segment.raw });
        }
        if (segment.type === 'amount' && amount === undefined) {
            if (!seen.has(AMOUNT_TOKEN)) {
                seen.add(AMOUNT_TOKEN);
                problems.push({ kind: 'amount-missing' });
            }
        }
    }

    const plain = segments
        .map((segment) => (segment.type === 'text' ? segment.text : '\n'))
        .join('');
    const hasAmountToken = segments.some(
        (segment) => segment.type === 'amount',
    );
    if (
        amount !== undefined &&
        amount !== 0 &&
        !hasAmountToken &&
        mentionsAmount(plain, amount)
    ) {
        problems.push({ kind: 'amount-twice', amount: Math.abs(amount) });
    } else if (amount !== undefined && amount !== 0 && !hasAmountToken) {
        // "Betaal 15" above "Betaal € 18": the text and the amount line say different things (bug 8).
        const money = moneyInText(
            segments
                .map((segment) =>
                    segment.type === 'text'
                        ? segment.text
                        : segment.type === 'currency'
                          ? CURRENCY_MARK
                          : '\n',
                )
                .join(''),
        );
        const other = money.find((value) => value !== Math.abs(amount));
        if (other !== undefined) {
            problems.push({ kind: 'amount-differs', mentioned: other });
        }
    }

    const currentNames = new Set(
        standardEdition.spaces.map((space) =>
            spaceNameOf(edition, space.position),
        ),
    );

    for (const space of standardEdition.spaces) {
        const was = space.name[edition.language];
        const now = spaceNameOf(edition, space.position);
        if (now === undefined || now === was || currentNames.has(was)) {
            continue;
        }
        const mention = new RegExp(
            `(?<![\\p{L}\\p{N}])${escapeRegExp(was)}(?![\\p{L}\\p{N}])`,
            'u',
        );
        if (mention.test(plain)) {
            problems.push({ kind: 'stale-name', was, now });
        }
    }

    return problems;
}
