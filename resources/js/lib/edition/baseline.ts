import { templateEdition } from '@/data/templates';
import type { Locale } from '@/lib/game/types';

import { sameOverride } from './changes';
import { NAMED_SPACE_KEYS, deckCardKeys } from './keys';
import {
    DEFAULT_PARTS,
    EMPTY_TEMPLATE,
    KNOWN_TEMPLATE_IDS,
    type Edition,
    type ElementField,
    type ElementOverride,
    type Elements,
    type Parts,
    type TemplateId,
} from './types';

/**
 * What "Standaard" means for an edition (B152): the template it started from, or the standard game for an
 * edition that started blank. The template's names, card texts, amounts, house rules and parts are the
 * baseline; everything the template does not set is the standard game, as before.
 */
export interface Baseline {
    template: TemplateId | null;
    elements: Readonly<Elements>;
    parts: Readonly<Parts>;
}

const STANDARD: Baseline = {
    template: null,
    elements: {},
    parts: DEFAULT_PARTS,
};

const LOCALES: readonly Locale[] = ['nl', 'en'];

const templates = new Map<string, Baseline | null>();

/**
 * The baseline of Leeg (B259): the standard edition with no name on a street, station or utility and no text on a
 * Chance or Community Chest card, as `emptiedEdition` makes it.
 */
function emptyBaseline(): Baseline {
    const elements: Elements = {};
    for (const key of NAMED_SPACE_KEYS) {
        elements[key] = { name: '' };
    }
    for (const deck of ['chance', 'chest'] as const) {
        for (const key of deckCardKeys({}, deck)) {
            elements[key] = { text: '' };
        }
    }

    return { template: EMPTY_TEMPLATE, elements, parts: DEFAULT_PARTS };
}

const EMPTY_BASELINE = emptyBaseline();

function templateBaseline(id: TemplateId, locale: Locale): Baseline | null {
    if (id === EMPTY_TEMPLATE) {
        return EMPTY_BASELINE;
    }
    const cacheKey = `${locale}/${id}`;
    let baseline = templates.get(cacheKey);
    if (baseline === undefined) {
        const edition = templateEdition(id, locale);
        baseline =
            edition === undefined
                ? null
                : {
                      template: id,
                      elements: edition.elements,
                      parts: edition.parts,
                  };
        templates.set(cacheKey, baseline);
    }

    return baseline;
}

/**
 * An edition made before B152 does not say which template it came from. It did when at least this many of the
 * template's names, card texts and house rules are still there word for word: no edition that started blank
 * has that, and a template edition only drops below it after nearly everything was rewritten.
 */
export const INFER_MIN_MATCHES = 8;

const inferred = new WeakMap<Elements, TemplateId | null>();

function matches(own: Elements, base: Readonly<Elements>): number {
    let count = 0;
    for (const [key, override] of Object.entries(base)) {
        const mine = own[key];
        if (mine === undefined) {
            continue;
        }
        if (
            (override.text !== undefined && mine.text === override.text) ||
            (override.name !== undefined && mine.name === override.name)
        ) {
            count++;
        }
    }

    return count;
}

/** The template an older edition most likely started from, or `null` when it did not clearly start from one. */
export function inferTemplate(
    edition: Pick<Edition, 'elements'>,
): TemplateId | null {
    const known = inferred.get(edition.elements);
    if (known !== undefined) {
        return known;
    }
    let best: TemplateId | null = null;
    let bestCount = INFER_MIN_MATCHES - 1;
    for (const locale of LOCALES) {
        for (const id of KNOWN_TEMPLATE_IDS) {
            // Leeg is only ever stored, never guessed: emptied names say nothing about where an edition began.
            if (id === EMPTY_TEMPLATE) {
                continue;
            }
            const base = templateBaseline(id, locale);
            const count =
                base === null ? 0 : matches(edition.elements, base.elements);
            if (count > bestCount) {
                best = id;
                bestCount = count;
            }
        }
    }
    inferred.set(edition.elements, best);

    return best;
}

/** The template of an edition: the stored one, else the inferred one for an edition from before B152. */
export function templateOf(
    edition: Pick<Edition, 'elements' | 'template'>,
): TemplateId | null {
    return edition.template ?? inferTemplate(edition);
}

/** The baseline of an edition, in its current language (a template follows the language like the standard game). */
export function baselineOf(
    edition: Pick<Edition, 'elements' | 'template' | 'language'>,
): Baseline {
    const id = templateOf(edition);

    return id === null
        ? STANDARD
        : (templateBaseline(id, edition.language) ?? STANDARD);
}

/** The override the baseline has for an element; `undefined` is the standard game. */
export function baselineElement(
    edition: Pick<Edition, 'elements' | 'template' | 'language'>,
    key: string,
): ElementOverride | undefined {
    return baselineOf(edition).elements[key];
}

/** The baseline value of one field of an element; `undefined` is the standard game. */
export function baselineField<F extends ElementField>(
    edition: Pick<Edition, 'elements' | 'template' | 'language'>,
    key: string,
    field: F,
): ElementOverride[F] {
    return baselineElement(edition, key)?.[field];
}

function sameValue(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }
    if (
        typeof a !== 'object' ||
        typeof b !== 'object' ||
        a === null ||
        b === null ||
        Array.isArray(a) !== Array.isArray(b)
    ) {
        return false;
    }
    const left = Object.entries(a).filter(([, value]) => value !== undefined);
    const right = Object.entries(b).filter(([, value]) => value !== undefined);

    return (
        left.length === right.length &&
        left.every(([key, value]) =>
            sameValue(value, (b as Record<string, unknown>)[key]),
        )
    );
}

/** Whether an element differs from its baseline: the dot, the counts and "Terug naar standaard" (B142, B152). */
export function differsFromBaseline(edition: Edition, key: string): boolean {
    return !sameOverride(edition.elements[key], baselineElement(edition, key));
}

/** Whether one field differs from its baseline, so the field shows "Standaard" (B142). */
export function fieldDiffers(
    edition: Edition,
    key: string,
    field: ElementField,
): boolean {
    return !sameValue(
        edition.elements[key]?.[field],
        baselineField(edition, key, field),
    );
}
