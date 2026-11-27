import {
    migrateHouseRules,
    migrateTemplateCardTexts,
    migrateTemplateId,
} from '@/lib/render/edition-templates';
import { validateProfile, type BoardProfile } from '@/lib/render/print-board';
import { isMoneyAmount } from '@/lib/render/print-money';
import { standardEdition } from '@/lib/render/standard-edition';
import type { CurrencyId, Locale } from '@/types/game';
import {
    ALLOWED_FIELDS,
    LEGACY_KEYS,
    REMOVED_KEYS,
    isExtraCardKey,
    parseKey,
} from './edition-keys';
import {
    parseField,
    type FieldContext,
    type FieldValues,
} from './edition-schema-fields';
import { MAX_NAME_LENGTH } from './edition-schema-limits';
import {
    isFiniteNumber,
    isObject,
    isString,
    type Obj,
} from './edition-schema-values';
import { isTemplateId } from './edition-template-ids';
import {
    DEFAULT_PARTS,
    EDITION_SCHEMA_VERSION,
    EXTRA_PART_IDS,
    PART_IDS,
    PRINT_SELECTION_PART_IDS,
    isThemeId,
    type Edition,
    type ElementField,
    type ElementOverride,
    type Parts,
    type PrintSelection,
} from './edition-types';

export type ParseResult<T> =
    { ok: true; value: T } | { ok: false; errors: string[] };

const isLocale = (value: unknown): value is Locale => {
    return value === 'nl' || value === 'en';
};

const isCurrency = (value: unknown): value is CurrencyId => {
    return standardEdition.currencies.some((currency) => currency.id === value);
};

const isAllowedField = (
    allowed: readonly ElementField[],
    field: string,
): field is ElementField => {
    return allowed.some((candidate) => candidate === field);
};

const setField = <F extends ElementField>(
    out: Partial<FieldValues>,
    field: F,
    value: unknown,
    context: FieldContext,
): void => {
    const parsed = parseField(field, value, context);
    if (parsed !== undefined) {
        out[field] = parsed;
    }
};

/** Validates one element override against the rules of its key. */
export const parseOverride = (
    key: string,
    value: unknown,
    errors: string[],
): ElementOverride | undefined => {
    const parsed = parseKey(key);
    if (parsed === null) {
        errors.push(`${key}: unknown element key`);
        return undefined;
    }
    if (!isObject(value)) {
        errors.push(`${key}: override must be an object`);
        return undefined;
    }
    const allowed = ALLOWED_FIELDS[parsed.kind];
    const out: Partial<FieldValues> = {};
    const before = errors.length;

    for (const [field, fieldValue] of Object.entries(value)) {
        if (fieldValue === undefined) {
            continue;
        }
        // Older editions still carry a layout; it is ignored (B122).
        if (field === 'layout') {
            continue;
        }
        if (!isAllowedField(allowed, field)) {
            errors.push(`${key}: field "${field}" is not allowed here`);
            continue;
        }
        setField(out, field, fieldValue, {
            key,
            parsed,
            at: `${key}.${field}`,
            errors,
        });
    }
    if (isExtraCardKey(key) && out.added !== true && errors.length === before) {
        errors.push(`${key}: an extra card needs "added": true`);
    }

    return errors.length === before ? out : undefined;
};

const parseParts = (value: unknown, errors: string[]): Parts | undefined => {
    if (!isObject(value)) {
        errors.push('parts: must be an object');
        return undefined;
    }
    const parts: Parts = { ...DEFAULT_PARTS };
    for (const id of PART_IDS) {
        const flag =
            value[id] ?? (EXTRA_PART_IDS.includes(id) ? false : undefined);
        if (typeof flag !== 'boolean') {
            errors.push(`parts.${id}: must be a boolean`);
            continue;
        }
        parts[id] = flag;
    }
    if (parts.board === false) {
        errors.push('parts.board: the board is always on');
    }

    return errors.length === 0 ? parts : undefined;
};

/** Validates a board profile; `validateProfile` words its problems in Dutch unless told otherwise. */
export const parseBoardProfile = (
    value: unknown,
    errors: string[],
): BoardProfile | undefined => {
    if (!isObject(value)) {
        errors.push('boardProfile: must be an object');
        return undefined;
    }
    const { id, name, outer, corner, border, panels, boxLid, provisional } =
        value;
    if (
        typeof id !== 'string' ||
        id === '' ||
        !isString(name, MAX_NAME_LENGTH)
    ) {
        errors.push('boardProfile: id and name must be strings');
        return undefined;
    }
    if (
        !isObject(boxLid) ||
        !isFiniteNumber(boxLid.w) ||
        !isFiniteNumber(boxLid.h)
    ) {
        errors.push('boardProfile.boxLid: w and h must be numbers');
        return undefined;
    }
    if (
        !isFiniteNumber(outer) ||
        !isFiniteNumber(corner) ||
        !isFiniteNumber(border) ||
        (panels !== 2 && panels !== 4)
    ) {
        errors.push(
            'boardProfile: outer, corner, border and panels (2 or 4) are required numbers',
        );
        return undefined;
    }
    const profile: BoardProfile = {
        id,
        name,
        outer,
        corner,
        border,
        panels,
        boxLid: { w: boxLid.w, h: boxLid.h },
    };
    if (provisional === true) {
        profile.provisional = true;
    }
    const problems = validateProfile(profile);
    if (problems.length > 0) {
        errors.push(...problems.map((problem) => `boardProfile: ${problem}`));
        return undefined;
    }

    return profile;
};

/**
 * Moves what older editions stored under a key that has since moved (`bank` became `words.bank`, B148). The
 * moved key wins over the old one when an edition has both. Elements that are gone (the dice and the houses and
 * hotels, B200) are dropped. Anything that is not an object is left for the
 * parser to reject.
 */
export const migrateElements = (value: unknown): unknown => {
    if (!isObject(value)) {
        return value;
    }
    const legacy = Object.entries(LEGACY_KEYS).filter(([key]) => key in value);
    const removed = REMOVED_KEYS.filter((key) => key in value);
    if (legacy.length === 0 && removed.length === 0) {
        return value;
    }
    const elements: Record<string, unknown> = { ...value };
    for (const key of removed) {
        delete elements[key];
    }
    for (const [key, moved] of legacy) {
        if (!(moved in elements)) {
            elements[moved] = elements[key];
        }
        delete elements[key];
    }

    return elements;
};

const parseElements = (
    value: unknown,
    errors: string[],
): Record<string, ElementOverride> | undefined => {
    if (!isObject(value)) {
        errors.push('elements: must be an object');
        return undefined;
    }
    const before = errors.length;
    const elements: Record<string, ElementOverride> = {};
    for (const [key, override] of Object.entries(value)) {
        const parsed = parseOverride(key, override, errors);
        if (parsed !== undefined) {
            elements[key] = parsed;
        }
    }

    return errors.length === before ? elements : undefined;
};

const checkHeader = (input: Obj, errors: string[]): void => {
    const {
        schemaVersion,
        id,
        name,
        language,
        currency,
        theme,
        revision,
        createdAt,
        updatedAt,
    } = input;

    if (schemaVersion !== EDITION_SCHEMA_VERSION) {
        errors.push(`schemaVersion: expected ${EDITION_SCHEMA_VERSION}`);
    }
    if (typeof id !== 'string' || id === '')
        errors.push('id: must be a non-empty string');
    if (!isString(name, MAX_NAME_LENGTH))
        errors.push(
            `name: must be a string of at most ${MAX_NAME_LENGTH} characters`,
        );
    if (!isLocale(language)) errors.push('language: must be "nl" or "en"');
    if (!isCurrency(currency)) errors.push('currency: unknown currency');
    if (!isThemeId(theme)) errors.push('theme: unknown theme');
    if (
        typeof revision !== 'number' ||
        !Number.isInteger(revision) ||
        revision < 0
    )
        errors.push('revision: must be a non-negative integer');
    if (!isFiniteNumber(createdAt)) errors.push('createdAt: must be a number');
    if (!isFiniteNumber(updatedAt)) errors.push('updatedAt: must be a number');
};

/** Small hand-written guard for an edition read from storage or a server. */
export const parseEdition = (input: unknown): ParseResult<Edition> => {
    const errors: string[] = [];
    if (!isObject(input)) {
        return { ok: false, errors: ['edition: must be an object'] };
    }
    const {
        id,
        name,
        language,
        currency,
        theme,
        revision,
        createdAt,
        updatedAt,
    } = input;
    checkHeader(input, errors);
    const boardProfile = parseBoardProfile(input.boardProfile, errors);
    const parts = parseParts(input.parts, errors);
    const elements = parseElements(migrateElements(input.elements), errors);

    // The template an edition started from (B152); one this version does not know is dropped, not rejected.
    const template = input.template;
    // How much play money to print (B156); an unknown value is dropped, like the template.
    const moneyAmount = input.moneyAmount;
    // What goes in the print set (B198); a value of the wrong shape is dropped, like the template.
    const printSelection = parsePrintSelection(input.printSelection);

    if (
        errors.length > 0 ||
        boardProfile === undefined ||
        parts === undefined ||
        elements === undefined ||
        typeof id !== 'string' ||
        typeof name !== 'string' ||
        !isLocale(language) ||
        !isCurrency(currency) ||
        !isThemeId(theme) ||
        typeof revision !== 'number' ||
        !isFiniteNumber(createdAt) ||
        !isFiniteNumber(updatedAt)
    ) {
        return { ok: false, errors };
    }

    const migrated = migrateTemplateCardTexts(
        migrateHouseRules(elements),
        isTemplateId(template) ? template : undefined,
    );
    // An edition from a template before it was rewritten keeps that version as its baseline (B193).
    const baseline = migrateTemplateId(
        isTemplateId(template) ? template : undefined,
        migrated,
    );

    return {
        ok: true,
        value: {
            schemaVersion: EDITION_SCHEMA_VERSION,
            id,
            name,
            language,
            currency,
            theme,
            boardProfile,
            parts,
            elements: migrated,
            ...(baseline === undefined ? {} : { template: baseline }),
            ...(isMoneyAmount(moneyAmount) ? { moneyAmount } : {}),
            ...(printSelection === undefined ? {} : { printSelection }),
            revision,
            createdAt,
            updatedAt,
        },
    };
};

/**
 * The choice of the print page (B198), or undefined when the value has the wrong shape. Parts this version does
 * not print are dropped (B200), the board is always in, and the parts come in print-page order. The same as
 * `PrintSelection::parse` on the server.
 */
const parsePrintSelection = (value: unknown): PrintSelection | undefined => {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }
    const set = 'set' in value ? value.set : undefined;
    const parts = 'parts' in value ? value.parts : undefined;
    if ((set !== 'home' && set !== 'printer') || !Array.isArray(parts)) {
        return undefined;
    }

    return {
        set,
        parts: PRINT_SELECTION_PART_IDS.filter(
            (part) => part === 'board' || parts.includes(part),
        ),
    };
};
