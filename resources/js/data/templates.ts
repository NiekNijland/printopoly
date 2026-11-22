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
    /**
     * Earlier texts of this card (B193). An edition that still has one of them word for word gets the text of now
     * when it opens, so an untouched template edition counts no change (B152).
     */
    was?: string[];
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
    /**
     * Earlier names by board position (B193), such as "De proefproeverij" before it became "De proeverij" (R5-17). An
     * edition that still has one of them gets the name of now when it opens, like `was` on a card.
     */
    spacesWas?: Record<string, string[]>;
    chance: TemplateCard[];
    chest: TemplateCard[];
    /** One rule per item; may hold `{0}` like a card text, so a rule follows a renamed Start. */
    houseRules: string[];
    /** Earlier house rules of the template, as whole lists (B193); migrated like `was` on a card. */
    houseRulesWas?: string[][];
    /** An example for the own lines on the box lid, in the spirit of the template (round 4, bug 25). */
    lidExample?: string;
    /** The small line above the headline and the headline of the invitation, when the template has its own (B193). */
    invitation?: { kicker?: string; headline?: string };
}

const files = import.meta.glob<TemplateData>('../../data/templates/*/*.json', {
    eager: true,
    import: 'default',
});

const BY_KEY = new Map<string, TemplateData>();
for (const [path, data] of Object.entries(files)) {
    const match = /templates\/(nl|en)\/([a-z0-9]+)\.json$/.exec(path);
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
 * House rules of a template as editions stored them before: Start as fixed text instead of a token, or an earlier
 * wording of the rules (`houseRulesWas`, B193), such as "dan krijg je 10" before it had the currency (round 4,
 * bug 33). Maps each older text to the text of now with tokens.
 */
const LEGACY_HOUSE_RULES = new Map<string, string>();
for (const data of BY_KEY.values()) {
    const written = spaceTokens(data.houseRules.join('\n'));
    const start = standardEdition.spaces[0]?.name[data.language] ?? 'Start';
    for (const rules of [data.houseRules, ...(data.houseRulesWas ?? [])]) {
        const joined = rules.join('\n');
        // Before round 4 (bug 33) an amount in a house rule had no currency: "dan krijg je 10".
        const withoutCurrency = joined.replace(/\{currency\}\s?/g, '');
        for (const before of [joined, withoutCurrency]) {
            for (const legacy of [
                spaceTokens(before),
                before.replace(/\{0\}/g, start),
            ]) {
                if (legacy !== written) {
                    LEGACY_HOUSE_RULES.set(legacy, written);
                }
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
 * "het dichtstbijzijnde {station}". Earlier wordings of a card (`was`, B193) count too, in each of those forms.
 * Maps each older text to the text with the tokens. A text that some template has now is never rewritten.
 */
const LEGACY_CARD_TEXTS = new Map<string, string>();
const CURRENT_CARD_TEXTS = new Set<string>();
for (const data of BY_KEY.values()) {
    for (const card of [...data.chance, ...data.chest]) {
        CURRENT_CARD_TEXTS.add(spaceTokens(card.text));
    }
}
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
        for (const source of [written, ...(card.was ?? []).map(spaceTokens)]) {
            const plainWords =
                words === undefined ? source : fillWords(source, words);
            const gendered = withGenderedArticle(source);
            for (const legacy of [
                source,
                plainWords,
                withoutCurrency(source),
                withoutCurrency(plainWords),
                gendered,
                words === undefined ? gendered : fillWords(gendered, words),
            ]) {
                if (legacy !== written && !CURRENT_CARD_TEXTS.has(legacy)) {
                    LEGACY_CARD_TEXTS.set(legacy, written);
                }
            }
        }
    }
}

/**
 * Earlier template names of a space (`spacesWas`), by template, `space.NN` and the old name, to the name of now. Only
 * an edition of that template changes: another template may use the old name on purpose.
 */
const LEGACY_SPACE_NAMES = new Map<string, string>();
for (const data of BY_KEY.values()) {
    for (const [position, names] of Object.entries(data.spacesWas ?? {})) {
        const now = data.spaces[position];
        for (const name of names) {
            if (now !== undefined && name !== now) {
                LEGACY_SPACE_NAMES.set(
                    `${data.id}|${spaceKey(Number(position))}|${name}`,
                    now,
                );
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
 * edition) and its spaces the names of now (`spacesWas`), so the cards read as the template does now and "Standaard" still counts no change for an untouched
 * template edition (B152). Only a text that is still an old template text word for word changes.
 */
export function migrateTemplateCardTexts(
    elements: Elements,
    template?: TemplateId,
): Elements {
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
        // A space with an earlier template name, at the same place (R5-17).
        const renamed =
            template !== undefined &&
            key.startsWith('space.') &&
            element.name !== undefined
                ? LEGACY_SPACE_NAMES.get(`${template}|${key}|${element.name}`)
                : undefined;
        if (renamed !== undefined) {
            out ??= { ...elements };
            out[key] = { ...(out[key] ?? element), name: renamed };
        }
    }

    return out ?? elements;
}

/** A rewritten template and the version before it (B193). */
const EARLIER_VERSION: Partial<Record<TemplateId, TemplateId>> = {
    club: 'club1',
    birthday: 'birthday1',
};

/** As many as `INFER_MIN_MATCHES` in `lib/edition/baseline.ts`: below it the edition was mostly rewritten anyway. */
const EARLIER_MIN_MATCHES = 8;

/** How many names, card texts and house rules of a template an edition still has word for word, in either language. */
function templateMatches(elements: Elements, id: TemplateId): number {
    let best = 0;
    for (const locale of ['nl', 'en'] as const) {
        const base = templateEdition(id, locale)?.elements ?? {};
        let count = 0;
        for (const [key, override] of Object.entries(base)) {
            const own = elements[key];
            if (
                own !== undefined &&
                ((override.text !== undefined && own.text === override.text) ||
                    (override.name !== undefined && own.name === override.name))
            ) {
                count++;
            }
        }
        best = Math.max(best, count);
    }

    return best;
}

/**
 * The template an edition keeps as its baseline (B193). An edition made from "Club of vereniging" or "Verjaardag"
 * before they were rewritten still has the old names and cards; it keeps the old version, so nothing on its board
 * changes and its untouched texts count as no change (B152). Give the elements after their card texts migrated.
 */
export function migrateTemplateId(
    id: TemplateId | undefined,
    elements: Elements,
): TemplateId | undefined {
    const earlier = id === undefined ? undefined : EARLIER_VERSION[id];
    if (id === undefined || earlier === undefined) {
        return id;
    }
    const old = templateMatches(elements, earlier);

    return old >= EARLIER_MIN_MATCHES && old > templateMatches(elements, id)
        ? earlier
        : id;
}

/** The example for the own lines on the box lid of an edition from this template (round 4, bug 25). */
export function lidExample(
    id: TemplateId | null,
    locale: Locale,
): string | undefined {
    return id === null ? undefined : template(id, locale)?.lidExample;
}

/** The kicker and headline the invitation of this template has when its owner wrote none (B193). */
export function templateInvitation(
    id: TemplateId | null,
    locale: Locale,
): { kicker?: string; headline?: string } {
    return (id === null ? undefined : template(id, locale)?.invitation) ?? {};
}
