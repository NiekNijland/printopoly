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
    const legacy = written.replace(/\{0\}/g, start);
    if (legacy !== written) {
        LEGACY_HOUSE_RULES.set(legacy, spaceTokens(written));
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
 * Card texts of the templates as editions stored them before the money in them got the currency token (bug 26,
 * ronde 3): "Je krijgt 200 van de bank" instead of "Je krijgt {currency} 200 van de bank". Maps that text to the
 * text with the token.
 */
const LEGACY_CARD_TEXTS = new Map<string, string>();
for (const data of BY_KEY.values()) {
    for (const card of [...data.chance, ...data.chest]) {
        const written = spaceTokens(card.text);
        const legacy = written
            .replaceAll(`${CURRENCY_TOKEN} `, '')
            .replaceAll(CURRENCY_TOKEN, '');
        if (legacy !== written) {
            LEGACY_CARD_TEXTS.set(legacy, written);
        }
    }
}

/**
 * Gives the money in the cards of an older template edition its currency sign, so the cards read as the template
 * does now and "Standaard" still counts no change for an untouched template edition (B152). Only a text that is
 * still the old template text word for word changes.
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
