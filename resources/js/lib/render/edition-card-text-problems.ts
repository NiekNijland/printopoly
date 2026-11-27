import { formatNumber } from '@/lib/number-format';
import { standardEdition } from '@/lib/render/standard-edition';
import {
    AMOUNT_TOKEN,
    parseCardText,
    spaceNameOf,
    type CardTextSegment,
} from './edition-card-text';
import type { Edition } from './edition-types';

export type CardTextProblem =
    | { kind: 'unknown-token'; token: string }
    | { kind: 'amount-missing' }
    /** The text spells out the amount that the amount line under it prints as well. */
    | { kind: 'amount-twice'; amount: number }
    /** The text names an amount of money that is not the amount printed under it (bug 8, ronde 3). */
    | { kind: 'amount-differs'; mentioned: number }
    /** The text says paying where the card receives, or the other way round: "Betaal een snoepje" above "Ontvang € 40" (bug 9, ronde 4). */
    | { kind: 'direction-differs'; says: 'pay' | 'receive' }
    /** The text says both paying and receiving, while the card does only one of them. */
    | { kind: 'direction-both' }
    | { kind: 'stale-name'; was: string; now: string };

/** Whether the text holds the amount as a number of its own ("Betaal 50"), not as a part of a bigger number. */
const mentionsAmount = (plain: string, amount: number): boolean => {
    const digits = String(Math.abs(amount));
    const formatted = new Set([
        digits,
        formatNumber(Math.abs(amount), 'nl-NL'),
        formatNumber(Math.abs(amount), 'en-GB'),
    ]);

    return [...formatted].some((form) =>
        new RegExp(`(?<![\\d.,])${escapeRegExp(form)}(?!\\d|[.,]\\d)`).test(
            plain,
        ),
    );
};

/**
 * The text with the first mention of `amount` as money replaced by `{amount}`, or `null` when it has none. With
 * `{amount}` in the text the line at the bottom of the card falls away (B140), so the amount is on the card once
 * and follows the amount field. "Bedrag aanpassen" uses it, so fixing one warning does not raise "the amount is
 * already at the bottom" (R5-11).
 */
export const amountIntoText = (text: string, amount: number): string | null => {
    const value = Math.abs(amount);
    const forms = [
        ...new Set([
            String(value),
            formatNumber(value, 'nl-NL'),
            formatNumber(value, 'en-GB'),
        ]),
    ].map(escapeRegExp);
    // Not a part of a bigger number, and never inside a token such as `{space:24}`.
    const number = new RegExp(
        `(?<![\\d.,:{])(?:${forms.join('|')})(?!\\d|[.,]\\d|[^{]*\\})`,
        'u',
    );
    const match = number.exec(text);
    if (match === null) {
        return null;
    }

    return `${text.slice(0, match.index)}${AMOUNT_TOKEN}${text.slice(match.index + match[0].length)}`;
};

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
const moneyInText = (plain: string): number[] => {
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
};

/** Words that say the player pays, and words that say the player receives, as whole words. */
const PAY_WORDS =
    /(?<![\p{L}])(?:betaal|betaalt|betalen|pay|pays)(?![\p{L}])/iu;
const RECEIVE_WORDS =
    /(?<![\p{L}])(?:ontvang|ontvangt|ontvangen|collect|collects|receive|receives)(?![\p{L}])/iu;

/**
 * Someone else who pays the player: "everyone pays you back", "pays you for it", "an old friend pays back what he
 * owes", "iedereen betaalt je terug", "betaalt zijn schuld terug". The player receives that money, so it counts as
 * receiving, not as paying (R5-11). "Je betaalt je huur" and "you pay back the loan" stay paying: there the
 * player is the one who pays.
 */
const NOT_THE_PLAYER = '(?<!(?<![\\p{L}])(?:you|je|jij|u)\\s+)';
const PAID_TO_PLAYER = [
    new RegExp(
        `(?<![\\p{L}])${NOT_THE_PLAYER}(?:pay|pays|repays|betaalt|betalen)\\s+(?:you|je|jou|u)(?![\\p{L}])`,
        'giu',
    ),
    new RegExp(
        `(?<![\\p{L}])${NOT_THE_PLAYER}(?:pays|repays)\\s+back(?![\\p{L}])`,
        'giu',
    ),
    new RegExp(
        `(?<![\\p{L}])${NOT_THE_PLAYER}(?:betaalt|betalen)(?:\\s+[^\\s.,;:!?]+){0,4}?\\s+terug(?![\\p{L}])`,
        'giu',
    ),
];

/** Which way the text says the money goes: pay, receive, both, or nothing said. */
const directionInText = (text: string): 'pay' | 'receive' | 'both' | null => {
    const plain = PAID_TO_PLAYER.reduce(
        (rest, phrase) => rest.replace(phrase, ' receive '),
        text,
    );
    const pay = PAY_WORDS.test(plain);
    const receive = RECEIVE_WORDS.test(plain);
    if (pay && receive) {
        return 'both';
    }

    return pay ? 'pay' : receive ? 'receive' : null;
};

const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const tokenProblems = (
    segments: readonly CardTextSegment[],
    amount: number | undefined,
): CardTextProblem[] => {
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

    return problems;
};

const amountProblems = (
    segments: readonly CardTextSegment[],
    plain: string,
    amount: number,
): CardTextProblem[] => {
    if (segments.some((segment) => segment.type === 'amount')) {
        return [];
    }
    if (mentionsAmount(plain, amount)) {
        return [{ kind: 'amount-twice', amount: Math.abs(amount) }];
    }
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

    return other === undefined
        ? []
        : [{ kind: 'amount-differs', mentioned: other }];
};

const directionProblems = (
    plain: string,
    amount: number,
): CardTextProblem[] => {
    const direction = directionInText(plain);
    if (direction === 'both') {
        return [{ kind: 'direction-both' }];
    }
    if (
        (direction === 'pay' && amount > 0) ||
        (direction === 'receive' && amount < 0)
    ) {
        return [{ kind: 'direction-differs', says: direction }];
    }

    return [];
};

const staleNameProblems = (
    plain: string,
    edition: Pick<Edition, 'elements' | 'language'>,
): CardTextProblem[] => {
    const problems: CardTextProblem[] = [];
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
};

/**
 * What the Controle has to say about a card text: tokens that are unknown, `{amount}` without an
 * amount, and a plain-text mention of a standard name of a space that has been renamed since
 * (the text predates the variables and would stay behind on a rename).
 */
export const cardTextProblems = (
    text: string,
    edition: Pick<Edition, 'elements' | 'language'>,
    amount: number | undefined,
): CardTextProblem[] => {
    const segments = parseCardText(text);
    const plain = segments
        .map((segment) => (segment.type === 'text' ? segment.text : '\n'))
        .join('');
    const counted = amount !== undefined && amount !== 0;

    return [
        ...tokenProblems(segments, amount),
        ...(counted ? amountProblems(segments, plain, amount) : []),
        // The words of the text against the amount line: with or without a number in the text (bug 9, ronde 4).
        ...(counted ? directionProblems(plain, amount) : []),
        ...staleNameProblems(plain, edition),
    ];
};
