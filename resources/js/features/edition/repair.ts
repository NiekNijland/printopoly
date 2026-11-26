import { defaultCurrency } from '@/lib/render/game-currency';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { standardEdition } from '@/lib/render/standard-edition';
import { amountField, clampAmount } from '../../lib/render/edition-amounts';
import { isExtraCardKey, parseKey } from '../../lib/render/edition-keys';
import {
    MAX_NAME_LENGTH,
    migrateElements,
    parseBoardProfile,
    parseEdition,
    parseOverride,
} from '../../lib/render/edition-schema';
import {
    DEFAULT_PARTS,
    EDITION_SCHEMA_VERSION,
    isThemeId,
    type Edition,
    type ElementOverride,
} from '../../lib/render/edition-types';

/** An edition read from storage, and what had to be repaired to read it. */
export type ReadEdition = {
    edition: Edition;
    /** What was dropped or changed, empty when the edition was valid as stored. */
    repaired: string[];
};

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads an edition from storage (this browser or the account) and repairs it when it breaks a rule, so the
 * edition always opens. A damaged edition is not refused anymore: an amount outside its range is pulled to the
 * nearest limit, a field that breaks a rule is dropped, and an element that cannot be read at all goes. Only
 * what cannot be guessed (no id, another schema version) still fails, with `undefined`.
 *
 * Before this, swapping two streets of different colour groups moved their own amounts along and the edition
 * could not be opened anymore (round 4, Lars). The repair gets those editions back.
 */
export const readStoredEdition = (input: unknown): ReadEdition | undefined => {
    const strict = parseEdition(input);
    if (strict.ok) {
        return { edition: strict.value, repaired: [] };
    }
    if (
        !isObject(input) ||
        input.schemaVersion !== EDITION_SCHEMA_VERSION ||
        typeof input.id !== 'string' ||
        input.id === ''
    ) {
        return undefined;
    }

    const repaired: string[] = [];
    const settings = repairSettings(input, repaired);
    const elements = repairElements(migrateElements(input.elements), repaired);
    const second = parseEdition({ ...input, ...settings, elements });

    return second.ok ? { edition: second.value, repaired } : undefined;
};

const repairSettings = (input: Obj, repaired: string[]): Obj => {
    const out: Obj = {};
    const fix = (field: string, value: unknown) => {
        out[field] = value;
        repaired.push(`${field}: reset`);
    };
    const { name, language, currency, theme, revision, createdAt } = input;

    if (typeof name !== 'string' || name.length > MAX_NAME_LENGTH) {
        fix(
            'name',
            typeof name === 'string' ? name.slice(0, MAX_NAME_LENGTH) : '',
        );
    }
    const locale = language === 'en' ? 'en' : 'nl';
    if (language !== 'nl' && language !== 'en') {
        fix('language', locale);
    }
    if (!currencyKnown(input, currency)) {
        fix('currency', defaultCurrency(locale));
    }
    if (!isThemeId(theme)) {
        fix('theme', 'classic');
    }
    if (!Number.isInteger(revision) || (revision as number) < 0) {
        fix('revision', 0);
    }
    if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) {
        fix('createdAt', 0);
    }
    if (
        typeof input.updatedAt !== 'number' ||
        !Number.isFinite(input.updatedAt)
    ) {
        fix('updatedAt', 0);
    }
    if (parseBoardProfile(input.boardProfile, []) === undefined) {
        fix('boardProfile', DEFAULT_BOARD_PROFILE);
    }
    const parts = repairParts(input.parts);
    if (parts !== undefined) {
        fix('parts', parts);
    }

    return out;
};

/** Whether the edition knows this currency: the parser names `currency` among its errors when it does not. */
const currencyKnown = (input: Obj, currency: unknown): boolean => {
    const result = parseEdition({ ...input, currency });

    return result.ok || !result.errors.some((e) => e.startsWith('currency:'));
};

/** Parts with every flag a boolean and the board on; `undefined` when the parts were fine. */
const repairParts = (value: unknown): Obj | undefined => {
    const source = isObject(value) ? value : {};
    const parts: Obj = {};
    let changed = !isObject(value);

    for (const [id, fallback] of Object.entries(DEFAULT_PARTS)) {
        const flag = source[id];
        if (typeof flag === 'boolean' || flag === undefined) {
            parts[id] = flag ?? fallback;
        } else {
            parts[id] = fallback;
            changed = true;
        }
    }
    if (parts.board !== true) {
        parts.board = true;
        changed = true;
    }

    return changed ? parts : undefined;
};

const repairElements = (
    value: unknown,
    repaired: string[],
): Record<string, ElementOverride> => {
    if (!isObject(value)) {
        repaired.push('elements: reset');

        return {};
    }
    const out: Record<string, ElementOverride> = {};

    for (const [key, override] of Object.entries(value)) {
        const whole = parseOverride(key, override, []);
        if (whole !== undefined) {
            out[key] = override as ElementOverride;
            continue;
        }
        if (parseKey(key) === null || !isObject(override)) {
            repaired.push(`${key}: dropped`);
            continue;
        }
        const kept = repairOverride(key, override, repaired);
        if (kept === undefined) {
            repaired.push(`${key}: dropped`);
        } else {
            out[key] = kept;
        }
    }

    return out;
};

/** The fields of one element that pass on their own; amounts are pulled into their range first. */
const repairOverride = (
    key: string,
    override: Obj,
    repaired: string[],
): ElementOverride | undefined => {
    const extra = isExtraCardKey(key);
    if (extra && override.added !== true) {
        return undefined;
    }
    const kept: Obj = {};

    for (const [field, raw] of Object.entries(override)) {
        if (raw === undefined || field === 'layout') {
            continue;
        }
        const value = field === 'amounts' ? clampAmounts(key, raw) : raw;
        const single = parseOverride(
            key,
            extra ? { added: true, [field]: value } : { [field]: value },
            [],
        ) as Obj | undefined;

        if (single !== undefined && single[field] !== undefined) {
            kept[field] = value;
            if (JSON.stringify(value) !== JSON.stringify(raw)) {
                repaired.push(`${key}.${field}: pulled into range`);
            }
        } else {
            repaired.push(`${key}.${field}: dropped`);
        }
    }

    if (
        Object.keys(kept).length === 0 ||
        parseOverride(key, kept, []) === undefined
    ) {
        return undefined;
    }

    return kept;
};

/** Own amounts of a space with every known amount a whole number within its range; unknown ids are dropped. */
const clampAmounts = (key: string, value: unknown): unknown => {
    if (!isObject(value)) {
        return value;
    }
    const space = standardEdition.spaces[Number(key.split('.')[1])];
    if (space === undefined) {
        return value;
    }
    const out: Record<string, number> = {};

    for (const [id, amount] of Object.entries(value)) {
        const field = amountField(space, id);
        if (
            field !== undefined &&
            typeof amount === 'number' &&
            Number.isFinite(amount)
        ) {
            out[id] = clampAmount(amount, field.standard);
        }
    }

    return out;
};
