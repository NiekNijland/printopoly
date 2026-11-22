import { NO_CARD_AMOUNT } from '@/lib/edition/amounts';
import { CURRENCY_TOKEN, spaceToken } from '@/lib/edition/card-text';
import { defaultCurrency } from '@/lib/edition/changes';
import { HOUSE_RULES_KEY, spaceKey } from '@/lib/edition/keys';
import {
    DEFAULT_PARTS,
    EDITION_SCHEMA_VERSION,
    isTemplateId,
    TEMPLATE_IDS,
    type Edition,
    type Elements,
    type Parts,
    type TemplateId,
    type ThemeId,
} from '@/lib/edition/types';
import { fillWords, standardWords } from '@/lib/edition/words';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';

/**
 * Starting points for a new edition (B127): a name, a theme, the parts, own street names, a full set
 * of Chance and Community Chest cards and three house rules. The data lives in
 * `resources/data/templates/{locale}/{id}.json`, one file per template and language.
 */

export { isTemplateId, TEMPLATE_IDS, type TemplateId };

interface TemplateCard {
    /**
     * May hold `{24}`: the name of the space at that position (`{0}` is Start). It becomes the token `{space:24}`
     * when the edition is made, so the card follows a renamed space as the standard cards do (B131).
     */
    text: string;
    /** Above 0 the player receives it, below 0 the player pays it. */
    amount?: number;
}

export interface TemplateData {
    id: TemplateId;
    language: Locale;
    label: string;
    tagline: string;
    /** The suggested name of the edition. */
    name: string;
    theme: ThemeId;
    parts: Omit<Parts, 'board'>;
    /** New names by board position: streets, stations and utilities. */
    spaces: Record<string, string>;
    chance: TemplateCard[];
    chest: TemplateCard[];
    /** One rule per item; may hold `{0}` like a card text, so a rule follows a renamed Start. */
    houseRules: string[];
}

const files = import.meta.glob<TemplateData>('../../data/templates/*/*.json', {
    eager: true,
    import: 'default',
});

const BY_KEY = new Map<string, TemplateData>();
for (const [path, data] of Object.entries(files)) {
    const match = /templates\/(nl|en)\/([a-z]+)\.json$/.exec(path);
    if (match !== null) {
        BY_KEY.set(`${match[1]}/${match[2]}`, data);
    }
}

export function template(
    id: TemplateId,
    locale: Locale,
): TemplateData | undefined {
    return BY_KEY.get(`${locale}/${id}`);
}

/** All templates in one language, in display order. */
export function templates(locale: Locale): TemplateData[] {
    return TEMPLATE_IDS.flatMap((id) => template(id, locale) ?? []);
}

const POSITIONS = new Set(
    standardEdition.spaces.map((space) => String(space.position)),
);

/** Turns `{24}` into the token `{space:24}`, which shows the current name of that space. */
export function spaceTokens(text: string): string {
    return text.replace(/\{(\d+)\}/g, (whole, position: string) =>
        POSITIONS.has(position) ? spaceToken(Number(position)) : whole,
    );
}

/** The edition a template stands for, with a fixed time so server and browser agree. */
export function templateEdition(
    id: TemplateId,
    locale: Locale,
): Edition | undefined {
    const data = template(id, locale);
    if (data === undefined) {
        return undefined;
    }
    const elements: Elements = {};

    for (const [position, name] of Object.entries(data.spaces)) {
        elements[spaceKey(Number(position))] = { name };
    }
    (['chance', 'chest'] as const).forEach((deck) => {
        data[deck].forEach((card, index) => {
            elements[`card.${deck}.${String(index + 1).padStart(2, '0')}`] = {
                text: spaceTokens(card.text),
                // The text of a template card is its own, so a standard amount line only stays when the template
                // sets an amount; without one the line is switched off.
                ...(card.amount !== undefined
                    ? { amount: card.amount }
                    : standardEdition.decks[deck][index]?.amount !== undefined
                      ? { amount: NO_CARD_AMOUNT }
                      : {}),
            };
        });
    });
    elements[HOUSE_RULES_KEY] = {
        text: spaceTokens(data.houseRules.join('\n')),
    };

    const time = Date.UTC(2026, 10, 20);

    return {
        schemaVersion: EDITION_SCHEMA_VERSION,
        id: `template-${id}`,
        name: data.name,
        language: locale,
        currency: defaultCurrency(locale),
        theme: data.theme,
        boardProfile: DEFAULT_BOARD_PROFILE,
        parts: { ...DEFAULT_PARTS, ...data.parts, board: true },
        elements,
        template: id,
        revision: 1,
        createdAt: time,
        updatedAt: time,
    };
}

/**
 * House rules of a template as editions stored them before the rules got tokens: Start as fixed text. Maps that
 * text to the text with tokens.
 */
const LEGACY_HOUSE_RULES = new Map<string, string>();
for (const data of BY_KEY.values()) {
    const written = data.houseRules.join('\n');
    const start = standardEdition.spaces[0]?.name[data.language] ?? 'Start';
    // Before round 4 (bug 33) an amount in a house rule had no currency: "dan krijg je 10".
    const withoutCurrency = written.replace(/\{currency\}\s?/g, '');
    for (const before of [written, withoutCurrency]) {
        for (const legacy of [
            before.replace(/\{0\}/g, start),
            spaceTokens(before),
        ]) {
            if (legacy !== spaceTokens(written)) {
                LEGACY_HOUSE_RULES.set(legacy, spaceTokens(written));
            }
        }
    }
}

/**
 * Gives the house rules of an older template edition their tokens, so the rules follow a renamed Start as the
 * cards do. Only a text that is still the template's word for word changes.
 */
export function migrateHouseRules(elements: Elements): Elements {
    const text = elements[HOUSE_RULES_KEY]?.text;
    const migrated =
        text === undefined ? undefined : LEGACY_HOUSE_RULES.get(text);
    if (migrated === undefined) {
        return elements;
    }

    return {
        ...elements,
        [HOUSE_RULES_KEY]: { ...elements[HOUSE_RULES_KEY], text: migrated },
    };
}

/**
 * The template sentence as it was before round 4 (bug 6): "het dichtstbijzijnde {station}" only fits a het-word, so
 * a renamed station ("steiger") read "het dichtstbijzijnde steiger". The sentence now has "een", which fits both.
 */
const GENDERED_ARTICLE: readonly (readonly [string, string])[] = [
    [
        'Ga vooruit tot je bij een {station} komt.',
        'Ga naar het dichtstbijzijnde {station}.',
    ],
];

function withGenderedArticle(text: string): string {
    return GENDERED_ARTICLE.reduce(
        (out, [now, before]) => out.replaceAll(now, before),
        text,
    );
}

/**
 * Card texts of the templates as editions stored them before they got their tokens: the money without the
 * currency token (bug 26, ronde 3), "Je krijgt 200 van de bank" instead of "Je krijgt {currency} 200 van de bank",
 * and the standard words instead of the word tokens (B177), "het dichtstbijzijnde station" instead of
 * "het dichtstbijzijnde {station}". Maps each older text to the text with the tokens.
 */
const LEGACY_CARD_TEXTS = new Map<string, string>();
for (const data of BY_KEY.values()) {
    const currency = standardEdition.currencies.find(
        (candidate) => candidate.id === defaultCurrency(data.language),
    );
    const words =
        currency === undefined
            ? undefined
            : standardWords(data.language, currency);
    for (const card of [...data.chance, ...data.chest]) {
        const written = spaceTokens(card.text);
        const plainWords =
            words === undefined ? written : fillWords(written, words);
        const gendered = withGenderedArticle(written);
        for (const legacy of [
            plainWords,
            withoutCurrency(written),
            withoutCurrency(plainWords),
            gendered,
            words === undefined ? gendered : fillWords(gendered, words),
        ]) {
            if (legacy !== written) {
                LEGACY_CARD_TEXTS.set(legacy, written);
            }
        }
    }
}

function withoutCurrency(text: string): string {
    return text
        .replaceAll(`${CURRENCY_TOKEN} `, '')
        .replaceAll(CURRENCY_TOKEN, '');
}

/**
 * Gives the cards of an older template edition their tokens (the currency sign before the money, the words of the
 * edition), so the cards read as the template does now and "Standaard" still counts no change for an untouched
 * template edition (B152). Only a text that is still an old template text word for word changes.
 */
export function migrateTemplateCardTexts(elements: Elements): Elements {
    let out: Elements | undefined;
    for (const [key, element] of Object.entries(elements)) {
        const migrated =
            key.startsWith('card.') && element.text !== undefined
                ? LEGACY_CARD_TEXTS.get(element.text)
                : undefined;
        if (migrated !== undefined) {
            out ??= { ...elements };
            out[key] = { ...element, text: migrated };
        }
    }

    return out ?? elements;
}
