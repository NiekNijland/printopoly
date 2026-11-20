import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { spaceKey } from './keys';
import type { Edition } from './types';

/**
 * Variables in card texts (B126).
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
                  }).format(context.amount);
        case 'unknown':
            return undefined;
    }
}

/**
 * The text as it is printed. A token that cannot be filled in (unknown, or `{amount}` on a card
 * without an amount) stays as typed.
 */
export function renderCardText(text: string, context: CardTextContext): string {
    return parseCardText(text)
        .map((segment) =>
            segment.type === 'text'
                ? segment.text
                : (tokenValue(segment, context) ?? serializeToken(segment)),
        )
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
): CardTextContext {
    const currency = standardEdition.currencies.find(
        (candidate) => candidate.id === edition.currency,
    );

    return {
        spaceName: (position) => spaceNameOf(edition, position),
        currencySymbol: currency?.symbol ?? '',
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
    | { kind: 'stale-name'; was: string; now: string };

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
